import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

import { VisualError } from "./errors.js";
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
      "ROL: SUBJECT",
    );
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
});
