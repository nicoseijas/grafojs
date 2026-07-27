import { VisualError } from "./errors.js";
import type {
  PulseKind,
  PulseLeg,
  PulseOptions,
  VisualEffects,
  VisualScene,
  VisualVisibility,
} from "./types.js";

const CLASS_TOKEN = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/;
const EDGE_KINDS = new Set(["relation", "implementation", "invisible"]);
const EDGE_DIRECTIONS = new Set(["forward", "both", "none"]);
const EDGE_ROUTINGS = new Set(["curve", "straight", "orthogonal"]);
const NODE_SHAPES = new Set(["rect", "pill", "ellipse", "diamond", "hexagon"]);
const PULSE_KINDS = new Set<PulseKind>(["call", "return", "error"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(
  value: unknown,
  field: string,
  entity: "scene" | "node" | "edge" | "pulse",
  id?: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new VisualError(
      "INVALID_GEOMETRY",
      `${field} must be a finite number.`,
      {
        entity,
        ...(id === undefined ? {} : { id }),
      },
    );
  }
  return value;
}

export function assertClassName(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !CLASS_TOKEN.test(value) ||
    value.startsWith("gjs-")
  ) {
    throw new VisualError(
      "INVALID_CLASS",
      "CSS classes must be single valid class tokens and must not use the reserved gjs- prefix.",
    );
  }
}

function validateClasses(
  value: unknown,
  entity: "node" | "edge",
  id: string,
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    throw new VisualError("INVALID_INPUT", "classes must be an array.", {
      entity,
      id,
    });
  }
  for (const className of value) {
    try {
      assertClassName(className);
    } catch (error) {
      if (error instanceof VisualError) {
        throw new VisualError(error.code, error.message, { entity, id });
      }
      throw error;
    }
  }
}

function validateNode(value: unknown, ids: Set<string>): void {
  if (!isRecord(value) || !validId(value.id)) {
    throw new VisualError(
      "INVALID_INPUT",
      "Each visual node needs a non-empty string id.",
      { entity: "node" },
    );
  }
  const id = value.id;
  if (ids.has(id)) {
    throw new VisualError(
      "DUPLICATE_NODE",
      `Duplicate visual node id: ${id}.`,
      {
        entity: "node",
        id,
      },
    );
  }
  ids.add(id);
  finiteNumber(value.x, "x", "node", id);
  finiteNumber(value.y, "y", "node", id);
  const width = finiteNumber(value.width, "width", "node", id);
  const height = finiteNumber(value.height, "height", "node", id);
  if (width <= 0 || height <= 0) {
    throw new VisualError(
      "INVALID_GEOMETRY",
      "Node width and height must be greater than zero.",
      { entity: "node", id },
    );
  }
  if (typeof value.label !== "string") {
    throw new VisualError("INVALID_INPUT", "Node label must be a string.", {
      entity: "node",
      id,
    });
  }
  if (
    value.shape !== undefined &&
    (typeof value.shape !== "string" || !NODE_SHAPES.has(value.shape))
  ) {
    throw new VisualError("INVALID_INPUT", `Invalid node shape for ${id}.`, {
      entity: "node",
      id,
    });
  }
  if (value.tag !== undefined && typeof value.tag !== "string") {
    throw new VisualError("INVALID_INPUT", "Node tag must be a string.", {
      entity: "node",
      id,
    });
  }
  if (value.role !== undefined && typeof value.role !== "string") {
    throw new VisualError("INVALID_INPUT", "Node role must be a string.", {
      entity: "node",
      id,
    });
  }
  validateClasses(value.classes, "node", id);
}

function validateEdge(
  value: unknown,
  nodeIds: ReadonlySet<string>,
  edgeIds: Set<string>,
): void {
  if (!isRecord(value) || !validId(value.id)) {
    throw new VisualError(
      "INVALID_INPUT",
      "Each visual edge needs a non-empty string id.",
      { entity: "edge" },
    );
  }
  const id = value.id;
  if (edgeIds.has(id)) {
    throw new VisualError(
      "DUPLICATE_EDGE",
      `Duplicate visual edge id: ${id}.`,
      {
        entity: "edge",
        id,
      },
    );
  }
  edgeIds.add(id);
  if (!validId(value.from) || !validId(value.to)) {
    throw new VisualError(
      "INVALID_INPUT",
      "Edge endpoints must be non-empty string ids.",
      { entity: "edge", id },
    );
  }
  if (!nodeIds.has(value.from) || !nodeIds.has(value.to)) {
    throw new VisualError(
      "MISSING_ENDPOINT",
      `Visual edge ${id} references an unknown endpoint.`,
      { entity: "edge", id },
    );
  }
  // The headless core allows self-loops, but no routing can draw one: start and
  // end coincide, so the path collapses to a point. Refusing is clearer than
  // emitting an edge that occupies the DOM and renders nothing.
  if (value.from === value.to) {
    throw new VisualError(
      "INVALID_GEOMETRY",
      `Visual edge ${id} cannot start and end at the same node.`,
      { entity: "edge", id },
    );
  }
  if (value.label !== undefined && typeof value.label !== "string") {
    throw new VisualError("INVALID_INPUT", "Edge label must be a string.", {
      entity: "edge",
      id,
    });
  }
  if (
    value.kind !== undefined &&
    (typeof value.kind !== "string" || !EDGE_KINDS.has(value.kind))
  ) {
    throw new VisualError("INVALID_INPUT", `Invalid edge kind for ${id}.`, {
      entity: "edge",
      id,
    });
  }
  if (
    value.direction !== undefined &&
    (typeof value.direction !== "string" ||
      !EDGE_DIRECTIONS.has(value.direction))
  ) {
    throw new VisualError(
      "INVALID_INPUT",
      `Invalid edge direction for ${id}.`,
      {
        entity: "edge",
        id,
      },
    );
  }
  if (
    value.routing !== undefined &&
    (typeof value.routing !== "string" || !EDGE_ROUTINGS.has(value.routing))
  ) {
    throw new VisualError("INVALID_INPUT", `Invalid edge routing for ${id}.`, {
      entity: "edge",
      id,
    });
  }
  if (value.bend !== undefined) {
    finiteNumber(value.bend, "bend", "edge", id);
  }
  validateClasses(value.classes, "edge", id);
}

export function validateScene(value: unknown): asserts value is VisualScene {
  if (
    !isRecord(value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  ) {
    throw new VisualError(
      "INVALID_INPUT",
      "A visual scene must contain node and edge arrays.",
      { entity: "scene" },
    );
  }
  const width = finiteNumber(value.width, "width", "scene");
  const height = finiteNumber(value.height, "height", "scene");
  if (width <= 0 || height <= 0) {
    throw new VisualError(
      "INVALID_GEOMETRY",
      "Scene width and height must be greater than zero.",
      { entity: "scene" },
    );
  }
  if (value.ariaLabel !== undefined && typeof value.ariaLabel !== "string") {
    throw new VisualError(
      "INVALID_INPUT",
      "Scene ariaLabel must be a string.",
      {
        entity: "scene",
      },
    );
  }
  const nodeIds = new Set<string>();
  for (const candidate of value.nodes) {
    validateNode(candidate, nodeIds);
  }
  const edgeIds = new Set<string>();
  for (const candidate of value.edges) {
    validateEdge(candidate, nodeIds, edgeIds);
  }
}

function validateTargets(
  targets: unknown,
  nodeIds: ReadonlySet<string>,
  edgeIds: ReadonlySet<string>,
): void {
  if (targets === undefined) {
    return;
  }
  if (!isRecord(targets)) {
    throw new VisualError("INVALID_INPUT", "Visual targets must be an object.");
  }
  const validateIds = (
    values: unknown,
    known: ReadonlySet<string>,
    entity: "node" | "edge",
  ): void => {
    if (values === undefined) {
      return;
    }
    if (!Array.isArray(values)) {
      throw new VisualError(
        "INVALID_INPUT",
        `${entity} targets must be an array.`,
      );
    }
    for (const id of values) {
      if (!validId(id)) {
        throw new VisualError(
          "INVALID_INPUT",
          `${entity} target ids must be strings.`,
        );
      }
      if (!known.has(id)) {
        throw new VisualError(
          entity === "node" ? "UNKNOWN_NODE" : "UNKNOWN_EDGE",
          `Unknown visual ${entity} id: ${id}.`,
          { entity, id },
        );
      }
    }
  };
  validateIds(targets.nodes, nodeIds, "node");
  validateIds(targets.edges, edgeIds, "edge");
}

export function validateVisibility(
  value: VisualVisibility,
  nodeIds: ReadonlySet<string>,
  edgeIds: ReadonlySet<string>,
): void {
  if (!isRecord(value)) {
    throw new VisualError("INVALID_INPUT", "Visibility must be an object.");
  }
  validateTargets(value.hidden, nodeIds, edgeIds);
}

export function validateEffects(
  value: VisualEffects,
  nodeIds: ReadonlySet<string>,
  edgeIds: ReadonlySet<string>,
): void {
  if (!isRecord(value)) {
    throw new VisualError("INVALID_INPUT", "Effects must be an object.");
  }
  validateTargets(value.hot, nodeIds, edgeIds);
  validateTargets(value.stress, nodeIds, edgeIds);
  validateTargets(value.muted, nodeIds, edgeIds);
}

export function validatePulse(
  legs: readonly PulseLeg[],
  options: PulseOptions,
  edgeIds: ReadonlySet<string>,
): {
  readonly kind: PulseKind;
  readonly durationMs: number;
  readonly radius: number;
} {
  if (!Array.isArray(legs) || legs.length === 0) {
    throw new VisualError(
      "INVALID_INPUT",
      "A pulse needs at least one edge leg.",
      {
        entity: "pulse",
      },
    );
  }
  for (const leg of legs as readonly unknown[]) {
    if (!isRecord(leg) || !validId(leg.edge)) {
      throw new VisualError(
        "INVALID_INPUT",
        "Each pulse leg needs an edge id.",
        {
          entity: "pulse",
        },
      );
    }
    if (!edgeIds.has(leg.edge)) {
      throw new VisualError(
        "UNKNOWN_EDGE",
        `Unknown visual edge id: ${leg.edge}.`,
        { entity: "edge", id: leg.edge },
      );
    }
    if (leg.reverse !== undefined && typeof leg.reverse !== "boolean") {
      throw new VisualError(
        "INVALID_INPUT",
        "Pulse leg reverse must be boolean.",
        { entity: "pulse" },
      );
    }
  }
  if (!isRecord(options)) {
    throw new VisualError("INVALID_INPUT", "Pulse options must be an object.", {
      entity: "pulse",
    });
  }
  const kindValue: unknown = options.kind;
  if (
    kindValue !== undefined &&
    (typeof kindValue !== "string" || !PULSE_KINDS.has(kindValue as PulseKind))
  ) {
    throw new VisualError("INVALID_INPUT", "Invalid pulse kind.", {
      entity: "pulse",
    });
  }
  const kind = (kindValue ?? "call") as PulseKind;
  const durationMs = finiteNumber(
    options.durationMs ?? 620,
    "durationMs",
    "pulse",
  );
  const radius = finiteNumber(options.radius ?? 5.5, "radius", "pulse");
  if (durationMs < 0 || radius <= 0) {
    throw new VisualError(
      "INVALID_GEOMETRY",
      "Pulse duration must be non-negative and radius must be greater than zero.",
      { entity: "pulse" },
    );
  }
  return { kind, durationMs, radius };
}
