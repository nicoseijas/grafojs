import { VisualError } from "./errors.js";
import { edgePath, pathData, pointOnPath, type EdgePath } from "./geometry.js";
import { nodeRowOffsets } from "./metrics.js";
import { DEFAULT_VISUAL_CSS } from "./styles.js";
import type {
  PulseLeg,
  PulseOptions,
  PulseResult,
  SvgGraphOptions,
  SvgGraphView,
  VisualEffects,
  VisualScene,
  VisualTargets,
  VisualVisibility,
} from "./types.js";
import {
  assertClassName,
  validateEffects,
  validatePulse,
  validateScene,
  validateVisibility,
} from "./validation.js";

const SVG_NS = "http://www.w3.org/2000/svg";
let rendererSequence = 0;

interface ActivePulse {
  frameId: number | undefined;
  settled: boolean;
  readonly finish: (result: PulseResult) => void;
}

interface PlannedLeg {
  readonly edge: string;
  readonly reverse: boolean;
}

interface RenderedEdge {
  readonly element: SVGGElement;
  readonly path: EdgePath;
}

const idsFrom = (
  values: readonly { readonly id: string }[],
): ReadonlySet<string> => new Set(values.map(({ id }) => id));

const targetIds = (
  targets: VisualTargets | undefined,
  kind: "nodes" | "edges",
): readonly string[] => targets?.[kind] ?? [];

export const createSvgGraph = (
  svg: SVGSVGElement,
  initialScene: VisualScene,
  options: SvgGraphOptions = {},
): SvgGraphView => {
  const svgValue: unknown = svg;
  if (
    typeof svgValue !== "object" ||
    svgValue === null ||
    !("ownerDocument" in svgValue)
  ) {
    throw new VisualError(
      "INVALID_INPUT",
      "createSvgGraph requires an SVG element.",
    );
  }

  const documentValue: unknown = svgValue.ownerDocument;
  if (
    typeof documentValue !== "object" ||
    documentValue === null ||
    !("createElementNS" in documentValue) ||
    typeof documentValue.createElementNS !== "function"
  ) {
    throw new VisualError(
      "INVALID_INPUT",
      "createSvgGraph requires an SVG element.",
    );
  }
  // An `instanceof SVGSVGElement` check needs a browser global, and the root
  // entry point must stay free of one. The namespace and the local name give
  // the same answer and work in every DOM implementation.
  if (
    !("namespaceURI" in svgValue) ||
    svgValue.namespaceURI !== SVG_NS ||
    !("localName" in svgValue) ||
    svgValue.localName !== "svg"
  ) {
    throw new VisualError(
      "INVALID_INPUT",
      "createSvgGraph requires an <svg> element in the SVG namespace.",
    );
  }

  const svgElement = svgValue as SVGSVGElement;
  const document = svgElement.ownerDocument;
  const platform = document.defaultView;
  if (platform === null) {
    throw new VisualError(
      "INVALID_INPUT",
      "The SVG element must belong to a document with a window.",
    );
  }

  // The renderer writes these attributes on the element of the host, so it
  // remembers the value of the host and puts it back on destroy. A host that
  // gave no value gets no attribute.
  const hostAttributes = (["viewBox", "role", "aria-label"] as const).map(
    (name): readonly [string, string | null] => [
      name,
      svgElement.getAttribute(name),
    ],
  );

  const instanceId = `gjs-${String(rendererSequence)}`;
  rendererSequence += 1;
  const markerId = `${instanceId}-arrow`;
  const implementationMarkerId = `${instanceId}-implementation`;
  let root = document.createElementNS(SVG_NS, "g");
  let nodeElements = new Map<string, SVGGElement>();
  let edgeElements = new Map<string, RenderedEdge>();
  let nodeIds: ReadonlySet<string> = new Set();
  let edgeIds: ReadonlySet<string> = new Set();
  let destroyed = false;
  const activePulses = new Set<ActivePulse>();

  const requestFrame = (callback: FrameRequestCallback): number =>
    platform.requestAnimationFrame(callback);
  const cancelFrame = (id: number): void => {
    platform.cancelAnimationFrame(id);
  };
  const clock = (): number => platform.performance.now();
  const reducedMotion =
    options.reducedMotion ??
    (() => platform.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const ensureActive = (): void => {
    if (destroyed) {
      throw new VisualError(
        "INVALID_INPUT",
        "This SVG graph view has been destroyed.",
      );
    }
  };

  const cancelPulses = (): void => {
    for (const active of [...activePulses]) {
      active.finish("cancelled");
    }
  };

  const element = <K extends keyof SVGElementTagNameMap>(
    name: K,
  ): SVGElementTagNameMap[K] => document.createElementNS(SVG_NS, name);

  const markers = (): SVGDefsElement => {
    const defs = element("defs");
    const arrow = element("marker");
    arrow.setAttribute("id", markerId);
    arrow.setAttribute("viewBox", "0 0 10 10");
    arrow.setAttribute("refX", "9");
    arrow.setAttribute("refY", "5");
    arrow.setAttribute("markerWidth", "6");
    arrow.setAttribute("markerHeight", "6");
    arrow.setAttribute("orient", "auto-start-reverse");
    const shape = element("path");
    shape.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    shape.setAttribute("fill", "context-stroke");
    arrow.append(shape);
    const implementation = element("marker");
    implementation.setAttribute("id", implementationMarkerId);
    implementation.setAttribute("viewBox", "0 0 10 10");
    implementation.setAttribute("refX", "9");
    implementation.setAttribute("refY", "5");
    implementation.setAttribute("markerWidth", "7");
    implementation.setAttribute("markerHeight", "7");
    implementation.setAttribute("orient", "auto-start-reverse");
    const triangle = element("path");
    triangle.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    triangle.setAttribute("fill", "var(--gjs-surface, #171a21)");
    triangle.setAttribute("stroke", "context-stroke");
    implementation.append(triangle);
    defs.append(arrow, implementation);
    return defs;
  };

  const setMultilineText = (text: SVGTextElement, value: string): void => {
    const lines = value.split(/\r?\n/);
    if (lines.length === 1) {
      text.textContent = value;
      return;
    }
    const x = text.getAttribute("x");
    for (const [index, line] of lines.entries()) {
      const span = element("tspan");
      if (x !== null) {
        span.setAttribute("x", x);
      }
      if (index > 0) {
        span.setAttribute("dy", "1.15em");
      }
      span.textContent = line;
      text.append(span);
    }
  };

  const nodeShape = (node: VisualScene["nodes"][number]): SVGElement => {
    const shape = node.shape ?? "rect";
    if (shape === "ellipse") {
      const ellipse = element("ellipse");
      ellipse.setAttribute("cx", String(node.x + node.width / 2));
      ellipse.setAttribute("cy", String(node.y + node.height / 2));
      ellipse.setAttribute("rx", String(node.width / 2));
      ellipse.setAttribute("ry", String(node.height / 2));
      return ellipse;
    }
    if (shape === "diamond" || shape === "hexagon") {
      const path = element("path");
      const points =
        shape === "diamond"
          ? [
              [node.x + node.width / 2, node.y],
              [node.x + node.width, node.y + node.height / 2],
              [node.x + node.width / 2, node.y + node.height],
              [node.x, node.y + node.height / 2],
            ]
          : [
              [node.x + node.width * 0.22, node.y],
              [node.x + node.width * 0.78, node.y],
              [node.x + node.width, node.y + node.height / 2],
              [node.x + node.width * 0.78, node.y + node.height],
              [node.x + node.width * 0.22, node.y + node.height],
              [node.x, node.y + node.height / 2],
            ];
      path.setAttribute(
        "d",
        `${points
          .map(([x, y], index) =>
            [index === 0 ? "M" : "L", String(x), String(y)].join(" "),
          )
          .join(" ")} Z`,
      );
      return path;
    }
    const rectangle = element("rect");
    rectangle.setAttribute("x", String(node.x));
    rectangle.setAttribute("y", String(node.y));
    rectangle.setAttribute("width", String(node.width));
    rectangle.setAttribute("height", String(node.height));
    rectangle.setAttribute(
      "rx",
      String(shape === "pill" ? node.height / 2 : 9),
    );
    return rectangle;
  };

  const textX = (node: VisualScene["nodes"][number]): number => {
    if (node.shape === "diamond") {
      return node.x + node.width * 0.32;
    }
    if (node.shape === "hexagon") {
      return node.x + node.width * 0.22 + 12;
    }
    if (node.shape === "ellipse") {
      return node.x + Math.max(22, node.width * 0.15);
    }
    return node.x + 22;
  };

  const render = (scene: VisualScene): void => {
    ensureActive();
    validateScene(scene);
    cancelPulses();

    nodeElements = new Map();
    edgeElements = new Map();
    nodeIds = idsFrom(scene.nodes);
    edgeIds = idsFrom(scene.edges);
    root = element("g");
    root.setAttribute("class", "gjs-root");
    root.setAttribute("data-grafo-renderer", instanceId);

    svgElement.setAttribute(
      "viewBox",
      `0 0 ${String(scene.width)} ${String(scene.height)}`,
    );
    svgElement.setAttribute("role", "img");
    svgElement.setAttribute(
      "aria-label",
      scene.ariaLabel ?? "Graph visualization",
    );

    const fragments: SVGElement[] = [markers()];
    if (options.injectStyles !== false) {
      const style = element("style");
      style.textContent = DEFAULT_VISUAL_CSS;
      fragments.push(style);
    }
    const edgesLayer = element("g");
    edgesLayer.setAttribute("class", "gjs-edges");
    const nodesLayer = element("g");
    nodesLayer.setAttribute("class", "gjs-nodes");
    const effectsLayer = element("g");
    effectsLayer.setAttribute("class", "gjs-effects");
    effectsLayer.setAttribute("aria-hidden", "true");

    const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));
    for (const edge of scene.edges) {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (from === undefined || to === undefined) {
        throw new VisualError(
          "MISSING_ENDPOINT",
          `Visual edge ${edge.id} references an unknown endpoint.`,
          { entity: "edge", id: edge.id },
        );
      }
      const renderedPath = edgePath(edge, from, to);
      const group = element("g");
      const kind = edge.kind ?? "relation";
      group.setAttribute(
        "class",
        ["gjs-edge", `gjs-edge--${kind}`, ...(edge.classes ?? [])].join(" "),
      );
      group.setAttribute("data-edge-id", edge.id);
      const path = element("path");
      path.setAttribute("d", pathData(renderedPath));
      const direction = edge.direction ?? "forward";
      const selectedMarker =
        kind === "implementation" ? implementationMarkerId : markerId;
      if (direction === "forward" || direction === "both") {
        path.setAttribute("marker-end", `url(#${selectedMarker})`);
      }
      if (direction === "both") {
        path.setAttribute("marker-start", `url(#${selectedMarker})`);
      }
      group.append(path);
      if (edge.label !== undefined) {
        const label = element("text");
        const midpoint = pointOnPath(renderedPath, 0.5);
        label.setAttribute("x", String(midpoint.x));
        label.setAttribute("y", String(midpoint.y - 4));
        label.setAttribute("text-anchor", "middle");
        label.textContent = edge.label;
        group.append(label);
      }
      edgesLayer.append(group);
      edgeElements.set(edge.id, { element: group, path: renderedPath });
    }

    for (const node of scene.nodes) {
      const group = element("g");
      group.setAttribute(
        "class",
        ["gjs-node", ...(node.classes ?? [])].join(" "),
      );
      group.setAttribute("data-node-id", node.id);
      const shape = nodeShape(node);
      shape.setAttribute(
        "class",
        `gjs-node-shape gjs-node-shape--${node.shape ?? "rect"}`,
      );
      const contentX = textX(node);
      const rows = nodeRowOffsets(node, node.height);
      const label = element("text");
      label.setAttribute("x", String(contentX));
      label.setAttribute("y", String(node.y + rows.label));
      setMultilineText(label, node.label);
      group.append(shape, label);
      if (node.tag !== undefined) {
        const tag = element("text");
        tag.setAttribute("class", "gjs-tag");
        tag.setAttribute("x", String(contentX));
        tag.setAttribute("y", String(node.y + rows.tag));
        // The case is a theme decision, so it belongs to CSS. JavaScript that
        // uppercases the text takes the choice away from the host, because
        // `text-transform` cannot restore the original case.
        tag.textContent = node.tag;
        group.append(tag);
      }
      if (node.role !== undefined) {
        const role = element("text");
        role.setAttribute("class", "gjs-role");
        role.setAttribute("x", String(contentX));
        role.setAttribute("y", String(node.y + rows.role));
        role.textContent = `${options.rolePrefix ?? "Role"}: ${node.role}`;
        group.append(role);
      }
      nodesLayer.append(group);
      nodeElements.set(node.id, group);
    }

    root.append(...fragments, edgesLayer, nodesLayer, effectsLayer);
    svgElement.replaceChildren(root);
  };

  const setVisibility = (visibility: VisualVisibility): void => {
    ensureActive();
    validateVisibility(visibility, nodeIds, edgeIds);
    const hiddenNodes = new Set(targetIds(visibility.hidden, "nodes"));
    const hiddenEdges = new Set(targetIds(visibility.hidden, "edges"));
    for (const [id, value] of nodeElements) {
      value.classList.toggle("gjs-hidden", hiddenNodes.has(id));
    }
    for (const [id, value] of edgeElements) {
      value.element.classList.toggle("gjs-hidden", hiddenEdges.has(id));
    }
  };

  const setEffects = (effects: VisualEffects): void => {
    ensureActive();
    validateEffects(effects, nodeIds, edgeIds);
    const update = (
      targets: VisualTargets | undefined,
      className: string,
    ): void => {
      const nodes = new Set(targetIds(targets, "nodes"));
      const edges = new Set(targetIds(targets, "edges"));
      for (const [id, value] of nodeElements) {
        value.classList.toggle(className, nodes.has(id));
      }
      for (const [id, value] of edgeElements) {
        value.element.classList.toggle(className, edges.has(id));
      }
    };
    update(effects.hot, "gjs-hot");
    update(effects.stress, "gjs-stress");
    update(effects.muted, "gjs-muted");
  };

  /**
   * `classList.toggle` flips the class when its second argument is not a
   * boolean, which would make these setters depend on how often they are
   * called rather than on the value passed.
   */
  const assertFlag = (value: unknown, field: string): boolean => {
    if (typeof value !== "boolean") {
      throw new VisualError("INVALID_INPUT", `${field} must be a boolean.`);
    }
    return value;
  };

  const setRolesVisible = (visible: boolean): void => {
    ensureActive();
    root.classList.toggle("gjs-roles-visible", assertFlag(visible, "visible"));
  };

  const setElementClass = (
    values: ReadonlyMap<string, SVGGElement | RenderedEdge>,
    id: string,
    className: string,
    enabled: boolean,
    kind: "node" | "edge",
  ): void => {
    ensureActive();
    assertClassName(className);
    assertFlag(enabled, "enabled");
    const value = values.get(id);
    if (value === undefined) {
      throw new VisualError(
        kind === "node" ? "UNKNOWN_NODE" : "UNKNOWN_EDGE",
        `Unknown visual ${kind} id: ${id}.`,
        { entity: kind, id },
      );
    }
    const target = "element" in value ? value.element : value;
    target.classList.toggle(className, enabled);
  };

  const pulse = async (
    legs: readonly PulseLeg[],
    pulseOptions: PulseOptions = {},
  ): Promise<PulseResult> => {
    ensureActive();
    const normalized = validatePulse(legs, pulseOptions, edgeIds);
    if (reducedMotion()) {
      return "reduced-motion";
    }

    // The host owns the array of legs, and an animation reads it across many
    // frames. This copy keeps the run on the legs that the validation
    // accepted, so a host that changes its own array does not change a pulse
    // that already started.
    const plan: readonly PlannedLeg[] = legs.map((leg) => ({
      edge: leg.edge,
      reverse: leg.reverse === true,
    }));

    const effectsLayer = root.querySelector<SVGGElement>(".gjs-effects");
    if (effectsLayer === null) {
      throw new VisualError(
        "INVALID_INPUT",
        "The SVG graph has no effects layer.",
      );
    }
    const dot = element("circle");
    dot.setAttribute("r", String(normalized.radius));
    dot.setAttribute(
      "class",
      [
        "gjs-pulse",
        normalized.kind === "return"
          ? "gjs-pulse--return"
          : normalized.kind === "error"
            ? "gjs-pulse--error"
            : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    dot.setAttribute("aria-hidden", "true");
    effectsLayer.append(dot);

    return await new Promise<PulseResult>((resolve) => {
      const active: ActivePulse = {
        frameId: undefined,
        settled: false,
        finish: (result) => {
          if (active.settled) {
            return;
          }
          active.settled = true;
          if (active.frameId !== undefined) {
            cancelFrame(active.frameId);
          }
          dot.remove();
          activePulses.delete(active);
          resolve(result);
        },
      };
      activePulses.add(active);
      let legIndex = 0;

      const animateLeg = (leg: PlannedLeg, rendered: RenderedEdge): void => {
        const startedAt = clock();
        const tick = (timestamp: number): void => {
          const progress = Math.min(
            1,
            (timestamp - startedAt) / normalized.durationMs,
          );
          const directedProgress = leg.reverse ? 1 - progress : progress;
          const point = pointOnPath(rendered.path, directedProgress);
          dot.setAttribute("cx", String(point.x));
          dot.setAttribute("cy", String(point.y));
          if (progress < 1) {
            active.frameId = requestFrame(tick);
            return;
          }
          active.frameId = undefined;
          legIndex += 1;
          runLeg();
        };
        active.frameId = requestFrame(tick);
      };

      // A leg of zero duration finishes at once, so the whole chain runs in
      // one turn. A loop keeps that turn on a flat stack, because one call
      // for each leg overflows the stack on a long chain.
      function runLeg(): void {
        for (;;) {
          const leg = plan[legIndex];
          if (leg === undefined) {
            active.finish("completed");
            return;
          }
          const rendered = edgeElements.get(leg.edge);
          if (rendered === undefined) {
            active.finish("cancelled");
            return;
          }
          if (normalized.durationMs > 0) {
            animateLeg(leg, rendered);
            return;
          }
          const point = pointOnPath(rendered.path, leg.reverse ? 0 : 1);
          dot.setAttribute("cx", String(point.x));
          dot.setAttribute("cy", String(point.y));
          legIndex += 1;
        }
      }

      runLeg();
    });
  };

  const destroy = (): void => {
    if (destroyed) {
      return;
    }
    cancelPulses();
    root.remove();
    for (const [name, value] of hostAttributes) {
      if (value === null) {
        svgElement.removeAttribute(name);
      } else {
        svgElement.setAttribute(name, value);
      }
    }
    destroyed = true;
    nodeElements.clear();
    edgeElements.clear();
  };

  render(initialScene);
  return {
    render,
    setVisibility,
    setEffects,
    setRolesVisible,
    setNodeClass: (id, className, enabled) => {
      setElementClass(nodeElements, id, className, enabled, "node");
    },
    setEdgeClass: (id, className, enabled) => {
      setElementClass(edgeElements, id, className, enabled, "edge");
    },
    pulse,
    destroy,
  };
};
