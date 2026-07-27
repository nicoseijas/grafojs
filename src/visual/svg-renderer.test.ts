import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

import { VisualError } from "./errors.js";
import { DEFAULT_VISUAL_CSS } from "./styles.js";
import { createSvgGraph } from "./svg-renderer.js";
import type { VisualScene } from "./types.js";

const scene: VisualScene = {
  width: 720,
  height: 400,
  ariaLabel: "Observer runtime",
  nodes: [
    {
      id: "store",
      x: 30,
      y: 160,
      width: 150,
      height: 64,
      label: "Store",
      shape: "ellipse",
      tag: "class",
      role: "Subject",
      classes: ["source"],
    },
    {
      id: "email",
      x: 480,
      y: 80,
      width: 180,
      height: 64,
      label: "Email subscriber",
      shape: "diamond",
      role: "Observer",
    },
    {
      id: "sms",
      x: 480,
      y: 240,
      width: 180,
      height: 64,
      label: "SMS subscriber",
      shape: "hexagon",
    },
  ],
  edges: [
    {
      id: "email-call",
      from: "store",
      to: "email",
      label: "notify",
      direction: "both",
      routing: "orthogonal",
    },
    {
      id: "sms-call",
      from: "store",
      to: "sms",
      kind: "implementation",
      routing: "straight",
    },
  ],
};

const fixture = (): SVGSVGElement => {
  const window = new Window();
  return window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as unknown as SVGSVGElement;
};

interface DrivenFixture {
  readonly svg: SVGSVGElement;
  /** Moves the clock and runs every frame that the loop asked for. */
  readonly advance: (ms: number) => void;
  readonly pendingFrames: () => number;
}

/**
 * A fixture that owns the clock and the frame loop. The renderer reads both
 * from the window of the SVG, so a test can run the animation frame by frame
 * and can assert the position of the pulse at each step.
 */
const drivenFixture = (): DrivenFixture => {
  const window = new Window();
  const svg = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as unknown as SVGSVGElement;

  let now = 0;
  let nextFrameId = 1;
  const frames = new Map<number, FrameRequestCallback>();

  const define = (name: string, value: unknown): void => {
    Object.defineProperty(window, name, {
      value,
      configurable: true,
      writable: true,
    });
  };

  define("performance", {
    now: () => now,
  });
  define("requestAnimationFrame", (callback: FrameRequestCallback): number => {
    const id = nextFrameId;
    nextFrameId += 1;
    frames.set(id, callback);
    return id;
  });
  define("cancelAnimationFrame", (id: number): void => {
    frames.delete(id);
  });

  return {
    svg,
    advance: (ms) => {
      now += ms;
      const due = [...frames.values()];
      frames.clear();
      for (const callback of due) {
        callback(now);
      }
    },
    pendingFrames: () => frames.size,
  };
};

const pulseCentre = (svg: SVGSVGElement): { x: number; y: number } => {
  const dot = svg.querySelector(".gjs-pulse");
  if (dot === null) {
    throw new Error("Missing pulse dot.");
  }
  return {
    x: Number(dot.getAttribute("cx")),
    y: Number(dot.getAttribute("cy")),
  };
};

const node = (svg: SVGSVGElement, id: string): SVGGElement => {
  const result = svg.querySelector<SVGGElement>(`[data-node-id="${id}"]`);
  if (result === null) {
    throw new Error(`Missing test node: ${id}`);
  }
  return result;
};

const edge = (svg: SVGSVGElement, id: string): SVGGElement => {
  const result = svg.querySelector<SVGGElement>(`[data-edge-id="${id}"]`);
  if (result === null) {
    throw new Error(`Missing test edge: ${id}`);
  }
  return result;
};

describe("createSvgGraph", () => {
  it("renders an accessible scene with deterministic layers and markers", () => {
    const svg = fixture();

    createSvgGraph(svg, scene);

    expect(svg.getAttribute("viewBox")).toBe("0 0 720 400");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Observer runtime");
    expect(svg.querySelectorAll(".gjs-node")).toHaveLength(3);
    expect(svg.querySelectorAll(".gjs-edge")).toHaveLength(2);
    expect(node(svg, "store").classList.contains("source")).toBe(true);
    expect(node(svg, "store").querySelector("ellipse")).not.toBeNull();
    expect(
      node(svg, "email").querySelector(".gjs-node-shape--diamond"),
    ).not.toBeNull();
    expect(
      node(svg, "sms").querySelector(".gjs-node-shape--hexagon"),
    ).not.toBeNull();
    expect(node(svg, "store").textContent).toContain("Store");
    expect(
      edge(svg, "sms-call").classList.contains("gjs-edge--implementation"),
    ).toBe(true);
    const bothPath = edge(svg, "email-call").querySelector("path");
    expect(bothPath?.hasAttribute("marker-start")).toBe(true);
    expect(bothPath?.hasAttribute("marker-end")).toBe(true);
    expect(bothPath?.getAttribute("d")).toContain("L");
  });

  it("replaces visibility and semantic effects", () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene);

    view.setVisibility({ hidden: { nodes: ["sms"], edges: ["sms-call"] } });
    view.setEffects({
      hot: { nodes: ["store"], edges: ["email-call"] },
      stress: { nodes: ["email"] },
    });

    expect(node(svg, "sms").classList.contains("gjs-hidden")).toBe(true);
    expect(edge(svg, "sms-call").classList.contains("gjs-hidden")).toBe(true);
    expect(node(svg, "store").classList.contains("gjs-hot")).toBe(true);
    expect(edge(svg, "email-call").classList.contains("gjs-hot")).toBe(true);
    expect(node(svg, "email").classList.contains("gjs-stress")).toBe(true);

    view.setVisibility({});
    view.setEffects({ muted: { nodes: ["store"] } });

    expect(node(svg, "sms").classList.contains("gjs-hidden")).toBe(false);
    expect(node(svg, "store").classList.contains("gjs-hot")).toBe(false);
    expect(node(svg, "store").classList.contains("gjs-muted")).toBe(true);
  });

  it("toggles roles and consumer classes", () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene);

    view.setRolesVisible(true);
    view.setNodeClass("email", "selected", true);
    view.setEdgeClass("email-call", "selected-path", true);

    expect(
      svg.querySelector(".gjs-root")?.classList.contains("gjs-roles-visible"),
    ).toBe(true);
    expect(node(svg, "email").classList.contains("selected")).toBe(true);
    expect(edge(svg, "email-call").classList.contains("selected-path")).toBe(
      true,
    );
  });

  it("lets localized hosts choose the role prefix", () => {
    const svg = fixture();

    createSvgGraph(svg, scene, { rolePrefix: "rol" }).setRolesVisible(true);

    expect(node(svg, "store").querySelector(".gjs-role")?.textContent).toBe(
      "rol: Subject",
    );
  });

  it("keeps the case of a tag and a role, and leaves it to the theme", () => {
    const svg = fixture();

    createSvgGraph(svg, scene);

    expect(node(svg, "store").querySelector(".gjs-tag")?.textContent).toBe(
      "class",
    );
    expect(DEFAULT_VISUAL_CSS).toContain("text-transform: uppercase");
  });

  it("completes zero-duration and reduced-motion pulses", async () => {
    const animatedSvg = fixture();
    const animated = createSvgGraph(animatedSvg, scene, {
      reducedMotion: () => false,
    });
    const reduced = createSvgGraph(fixture(), scene, {
      reducedMotion: () => true,
    });

    await expect(
      animated.pulse(
        [{ edge: "email-call" }, { edge: "sms-call", reverse: true }],
        { durationMs: 0, kind: "return" },
      ),
    ).resolves.toBe("completed");
    expect(animatedSvg.querySelector(".gjs-pulse")).toBeNull();
    await expect(reduced.pulse([{ edge: "email-call" }])).resolves.toBe(
      "reduced-motion",
    );
  });

  it("cancels active pulses when rendering another scene", async () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene, {
      reducedMotion: () => false,
    });

    const running = view.pulse([{ edge: "email-call" }], { durationMs: 1000 });
    view.render(scene);

    await expect(running).resolves.toBe("cancelled");
  });

  it("destroys owned content and rejects later operations", () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene);

    view.destroy();
    view.destroy();

    expect(svg.children).toHaveLength(0);
    expect(() => {
      view.setEffects({});
    }).toThrow(VisualError);
  });

  it("reports malformed scenes and unknown targets with stable codes", () => {
    const svg = fixture();
    const orphan = {
      ...scene,
      edges: [{ id: "orphan", from: "store", to: "missing" }],
    };

    expect(() => {
      createSvgGraph(svg, orphan);
    }).toThrow(expect.objectContaining({ code: "MISSING_ENDPOINT" }));

    const view = createSvgGraph(svg, scene);
    expect(() => {
      view.setVisibility({ hidden: { nodes: ["missing"] } });
    }).toThrow(expect.objectContaining({ code: "UNKNOWN_NODE" }));
    expect(() => {
      view.setNodeClass("store", "gjs-owned", true);
    }).toThrow(expect.objectContaining({ code: "INVALID_CLASS" }));
    expect(() => {
      createSvgGraph(svg, {
        ...scene,
        nodes: [{ ...scene.nodes[0], shape: "triangle" }],
        edges: [],
      } as unknown as VisualScene);
    }).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(() => {
      createSvgGraph(svg, {
        ...scene,
        edges: [{ ...scene.edges[0], routing: "diagonal" }],
      } as unknown as VisualScene);
    }).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("does not interpret labels as markup", () => {
    const svg = fixture();
    const firstNode = scene.nodes[0];
    if (firstNode === undefined) {
      throw new Error("Missing test fixture node.");
    }
    createSvgGraph(svg, {
      ...scene,
      nodes: [{ ...firstNode, label: "<script>unsafe()</script>" }],
      edges: [],
    });

    expect(svg.querySelector("script")).toBeNull();
    expect(node(svg, "store").textContent).toContain(
      "<script>unsafe()</script>",
    );
  });

  it("renders line breaks as SVG text spans", () => {
    const svg = fixture();
    const firstNode = scene.nodes[0];
    if (firstNode === undefined) {
      throw new Error("Missing test fixture node.");
    }

    createSvgGraph(svg, {
      ...scene,
      nodes: [{ ...firstNode, label: "Inside\nNavigator" }],
      edges: [],
    });

    const spans = node(svg, "store").querySelectorAll(
      "text:first-of-type tspan",
    );
    expect(spans).toHaveLength(2);
    expect(spans[1]?.getAttribute("dy")).toBe("1.15em");
  });

  it("renders default rectangles and pill shapes", () => {
    const svg = fixture();
    createSvgGraph(svg, {
      width: 400,
      height: 160,
      nodes: [
        {
          id: "default",
          x: 20,
          y: 40,
          width: 120,
          height: 60,
          label: "Default",
        },
        {
          id: "pill",
          x: 220,
          y: 40,
          width: 120,
          height: 60,
          label: "Pill",
          shape: "pill",
        },
      ],
      edges: [],
    });

    expect(node(svg, "default").querySelector("rect")?.getAttribute("rx")).toBe(
      "9",
    );
    expect(node(svg, "pill").querySelector("rect")?.getAttribute("rx")).toBe(
      "30",
    );
  });

  it("gives tags more vertical room and insets polygon labels", () => {
    const svg = fixture();
    createSvgGraph(svg, scene);

    const storeTexts = node(svg, "store").querySelectorAll("text");
    expect(storeTexts[0]?.getAttribute("x")).toBe("52.5");
    expect(storeTexts[0]?.getAttribute("y")).toBe("186");
    expect(storeTexts[1]?.getAttribute("y")).toBe("208");
    expect(node(svg, "email").querySelector("text")?.getAttribute("x")).toBe(
      "537.6",
    );
  });

  it("rejects a self-loop edge instead of drawing a degenerate path", () => {
    const svg = fixture();

    expect(() =>
      createSvgGraph(svg, {
        width: 200,
        height: 100,
        nodes: [{ id: "a", x: 10, y: 10, width: 50, height: 20, label: "A" }],
        edges: [{ id: "loop", from: "a", to: "a" }],
      }),
    ).toThrow(VisualError);
    expect(() =>
      createSvgGraph(svg, {
        width: 200,
        height: 100,
        nodes: [{ id: "a", x: 10, y: 10, width: 50, height: 20, label: "A" }],
        edges: [{ id: "loop", from: "a", to: "a" }],
      }),
    ).toThrow("cannot start and end at the same node");
  });

  it("requires a boolean flag rather than silently toggling", () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene);

    expect(() => {
      view.setRolesVisible(undefined as never);
    }).toThrow(VisualError);
    expect(() => {
      view.setNodeClass("store", "sel", undefined as never);
    }).toThrow(VisualError);
    expect(() => {
      view.setEdgeClass("email-call", "sel", undefined as never);
    }).toThrow("must be a boolean");

    view.setRolesVisible(true);
    view.setRolesVisible(true);
    expect(
      svg.querySelector(".gjs-root")?.classList.contains("gjs-roles-visible"),
    ).toBe(true);
  });

  // The class contract of docs/visual/class-contract.md. A host that gives its
  // own styles writes selectors against these names, so a rename is a breaking
  // change and not a patch.
  it("holds the published class contract", () => {
    const svg = fixture();
    const box = { width: 120, height: 60 };
    const view = createSvgGraph(svg, {
      width: 900,
      height: 400,
      nodes: [
        {
          id: "rect",
          x: 20,
          y: 20,
          ...box,
          label: "Rect",
          tag: "class",
          role: "Subject",
        },
        { id: "pill", x: 200, y: 20, ...box, label: "Pill", shape: "pill" },
        {
          id: "ellipse",
          x: 380,
          y: 20,
          ...box,
          label: "Ellipse",
          shape: "ellipse",
        },
        {
          id: "diamond",
          x: 560,
          y: 20,
          ...box,
          label: "Diamond",
          shape: "diamond",
        },
        {
          id: "hexagon",
          x: 740,
          y: 20,
          ...box,
          label: "Hexagon",
          shape: "hexagon",
        },
      ],
      edges: [
        { id: "relation", from: "rect", to: "pill" },
        {
          id: "implementation",
          from: "pill",
          to: "ellipse",
          kind: "implementation",
        },
        {
          id: "invisible",
          from: "ellipse",
          to: "diamond",
          kind: "invisible",
        },
      ],
    });

    view.setVisibility({ hidden: { nodes: ["hexagon"] } });
    view.setEffects({
      hot: { nodes: ["rect"] },
      stress: { nodes: ["pill"] },
      muted: { edges: ["relation"] },
    });
    view.setRolesVisible(true);

    const contract = [
      '[data-node-id="rect"]',
      '[data-edge-id="relation"]',
      ".gjs-root",
      ".gjs-node",
      ".gjs-edge",
      ".gjs-edge--relation",
      ".gjs-edge--implementation",
      ".gjs-edge--invisible",
      ".gjs-node-shape",
      ".gjs-node-shape--rect",
      ".gjs-node-shape--pill",
      ".gjs-node-shape--ellipse",
      ".gjs-node-shape--diamond",
      ".gjs-node-shape--hexagon",
      ".gjs-tag",
      ".gjs-role",
      ".gjs-hidden",
      ".gjs-hot",
      ".gjs-stress",
      ".gjs-muted",
      ".gjs-root.gjs-roles-visible",
    ];

    for (const selector of contract) {
      expect(svg.querySelector(selector), selector).not.toBeNull();
    }

    for (const property of [
      "--gjs-surface",
      "--gjs-ink",
      "--gjs-muted",
      "--gjs-line",
      "--gjs-accent",
      "--gjs-interface",
      "--gjs-danger",
    ]) {
      expect(DEFAULT_VISUAL_CSS, property).toContain(`${property}:`);
    }
  });

  it("holds the pulse class contract for each kind", () => {
    const { svg } = drivenFixture();
    const view = createSvgGraph(svg, scene, { reducedMotion: () => false });

    void view.pulse([{ edge: "email-call" }], { durationMs: 1000 });
    expect(svg.querySelector(".gjs-pulse")?.getAttribute("aria-hidden")).toBe(
      "true",
    );

    void view.pulse([{ edge: "email-call" }], {
      durationMs: 1000,
      kind: "return",
    });
    void view.pulse([{ edge: "email-call" }], {
      durationMs: 1000,
      kind: "error",
    });

    expect(svg.querySelector(".gjs-pulse--return")).not.toBeNull();
    expect(svg.querySelector(".gjs-pulse--error")).not.toBeNull();

    view.destroy();
  });

  it("moves the pulse through the frame loop and runs each leg in order", async () => {
    const { svg, advance, pendingFrames } = drivenFixture();
    const view = createSvgGraph(svg, scene, { reducedMotion: () => false });

    const running = view.pulse(
      [{ edge: "email-call" }, { edge: "sms-call", reverse: true }],
      { durationMs: 100 },
    );

    // The first leg goes from the store on the left to the email node on the
    // right, so the dot moves to the right on each frame.
    expect(pendingFrames()).toBe(1);
    advance(50);
    const first = pulseCentre(svg);
    advance(25);
    const second = pulseCentre(svg);
    expect(second.x).toBeGreaterThan(first.x);
    expect(pendingFrames()).toBe(1);

    // The frame that ends the first leg also starts the second leg.
    advance(25);
    const legEnd = pulseCentre(svg);
    expect(legEnd.x).toBeGreaterThan(second.x);
    expect(pendingFrames()).toBe(1);

    // The second leg is reverse, so the dot goes back to the store.
    advance(30);
    const third = pulseCentre(svg);
    advance(30);
    const fourth = pulseCentre(svg);
    expect(fourth.x).toBeLessThan(third.x);

    advance(40);
    expect(svg.querySelector(".gjs-pulse")).toBeNull();
    expect(pendingFrames()).toBe(0);
    await expect(running).resolves.toBe("completed");
  });

  it("stops the frame loop when the host destroys the view", async () => {
    const { svg, advance, pendingFrames } = drivenFixture();
    const view = createSvgGraph(svg, scene, { reducedMotion: () => false });

    const running = view.pulse([{ edge: "email-call" }], { durationMs: 1000 });
    advance(100);
    expect(pendingFrames()).toBe(1);

    view.destroy();

    expect(pendingFrames()).toBe(0);
    expect(svg.querySelector(".gjs-pulse")).toBeNull();
    await expect(running).resolves.toBe("cancelled");
  });

  it("never changes the scene records or the arrays of the host", async () => {
    const { svg, advance } = drivenFixture();
    const hostNodes = [
      {
        id: "store",
        x: 30,
        y: 160,
        width: 150,
        height: 64,
        label: "Store",
        tag: "class",
        role: "Subject",
        classes: ["source"],
      },
      { id: "email", x: 480, y: 80, width: 180, height: 64, label: "Email" },
    ];
    const hostEdges = [{ id: "email-call", from: "store", to: "email" }];
    const hostScene = {
      width: 720,
      height: 400,
      nodes: hostNodes,
      edges: hostEdges,
    };
    const snapshot = structuredClone(hostScene);
    const hotNodes = ["store"];
    const hiddenEdges = ["email-call"];

    const view = createSvgGraph(svg, hostScene, {
      reducedMotion: () => false,
    });
    view.setEffects({ hot: { nodes: hotNodes } });
    view.setVisibility({ hidden: { edges: hiddenEdges } });
    view.setRolesVisible(true);
    view.setNodeClass("store", "selected", true);
    const running = view.pulse([{ edge: "email-call" }], { durationMs: 100 });
    advance(100);
    await running;
    view.render(hostScene);
    view.destroy();

    expect(hostScene).toStrictEqual(snapshot);
    expect(hostScene.nodes).toBe(hostNodes);
    expect(hostScene.edges).toBe(hostEdges);
    expect(hotNodes).toStrictEqual(["store"]);
    expect(hiddenEdges).toStrictEqual(["email-call"]);
  });

  it("follows the order of the arrays for the paint order", () => {
    const svg = fixture();
    const view = createSvgGraph(svg, scene);

    const layers = [...(svg.querySelector(".gjs-root")?.children ?? [])].map(
      (layer) => layer.getAttribute("class"),
    );
    expect(layers.indexOf("gjs-edges")).toBeLessThan(
      layers.indexOf("gjs-nodes"),
    );

    const paintOrder = (): readonly (string | null)[] =>
      [...svg.querySelectorAll(".gjs-node")].map((element) =>
        element.getAttribute("data-node-id"),
      );

    expect(paintOrder()).toStrictEqual(["store", "email", "sms"]);
    expect(
      [...svg.querySelectorAll(".gjs-edge")].map((element) =>
        element.getAttribute("data-edge-id"),
      ),
    ).toStrictEqual(["email-call", "sms-call"]);

    view.render({ ...scene, nodes: [...scene.nodes].reverse() });

    expect(paintOrder()).toStrictEqual(["sms", "email", "store"]);
  });
});
