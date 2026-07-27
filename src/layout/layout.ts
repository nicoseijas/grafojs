import { LayoutError } from "./errors.js";
import type {
  ColumnLayoutOptions,
  LayoutAlignment,
  LayoutBounds,
  LayoutNode,
  LayoutPosition,
  LayoutResult,
  RadialLayoutOptions,
  RowLayoutOptions,
  TreeLayoutLink,
  TreeLayoutOptions,
} from "./types.js";

const DEFAULT_GAP = 48;

interface TreeBox {
  readonly width: number;
  readonly height: number;
}

/**
 * Explicit traversal frame. Tree placement walks with these instead of the
 * call stack, so depth is bounded by heap rather than by the ~2.6k-frame
 * JavaScript stack limit.
 */
interface TreeFrame {
  readonly id: string;
  nextIndex: number;
}

interface PlaceFrame {
  readonly id: string;
  readonly boxX: number;
  readonly boxY: number;
}

const validId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const finite = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new LayoutError(
      "INVALID_GEOMETRY",
      `${field} must be a finite number.`,
    );
  }
  return value;
};

const nonNegative = (value: unknown, field: string): number => {
  const result = finite(value, field);
  if (result < 0) {
    throw new LayoutError(
      "INVALID_GEOMETRY",
      `${field} must be greater than or equal to zero.`,
    );
  }
  return result;
};

const origin = (options: {
  readonly x?: number;
  readonly y?: number;
}): LayoutPosition => ({
  x: finite(options.x ?? 0, "x"),
  y: finite(options.y ?? 0, "y"),
});

const gap = (value: number | undefined, field: string): number =>
  nonNegative(value ?? DEFAULT_GAP, field);

const validateNodes = (
  nodes: readonly LayoutNode[],
): ReadonlyMap<string, LayoutNode> => {
  const byId = new Map<string, LayoutNode>();
  for (const node of nodes) {
    if (!validId(node.id)) {
      throw new LayoutError(
        "INVALID_INPUT",
        "Each layout node needs a non-empty string id.",
      );
    }
    if (byId.has(node.id)) {
      throw new LayoutError(
        "DUPLICATE_NODE",
        `Duplicate layout node id: ${node.id}.`,
        node.id,
      );
    }
    const width = finite(node.width, "width");
    const height = finite(node.height, "height");
    if (width <= 0 || height <= 0) {
      throw new LayoutError(
        "INVALID_GEOMETRY",
        "Layout node width and height must be greater than zero.",
        node.id,
      );
    }
    byId.set(node.id, node);
  }
  return byId;
};

const alignment = (value: unknown): LayoutAlignment => {
  const resolved = value ?? "center";
  if (resolved !== "start" && resolved !== "center" && resolved !== "end") {
    throw new LayoutError(
      "INVALID_INPUT",
      "align must be start, center, or end.",
    );
  }
  return resolved;
};

const alignmentOffset = (
  available: number,
  size: number,
  value: LayoutAlignment,
): number => {
  if (value === "start") {
    return 0;
  }
  if (value === "end") {
    return available - size;
  }
  return (available - size) / 2;
};

/**
 * Largest projected value, without spreading the input into `Math.max`.
 * Spreading passes one argument per node and overflows the argument stack
 * around 125k nodes.
 */
const maxBy = <T>(
  items: readonly T[],
  select: (item: T) => number,
  initial: number,
): number => {
  let largest = initial;
  for (const item of items) {
    const value = select(item);
    if (value > largest) {
      largest = value;
    }
  }
  return largest;
};

const BOUNDS_FIELDS = ["x", "y", "width", "height"] as const;

/**
 * Single exit point of every layout, so that accumulated arithmetic is checked
 * as strictly as the inputs were. Node sizes and gaps are each finite, but
 * their running totals can still overflow to `Infinity` and, once subtracted
 * from each other, to `NaN` — which the visual layer would then reject.
 */
const result = (
  positions: ReadonlyMap<string, LayoutPosition>,
  bounds: LayoutBounds,
): LayoutResult => {
  for (const [id, position] of positions) {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new LayoutError(
        "INVALID_GEOMETRY",
        `Layout produced a non-finite position for node ${id}. Node sizes and gaps are too large to accumulate.`,
        id,
      );
    }
  }
  for (const field of BOUNDS_FIELDS) {
    if (!Number.isFinite(bounds[field])) {
      throw new LayoutError(
        "INVALID_GEOMETRY",
        `Layout produced non-finite bounds ${field}. Node sizes and gaps are too large to accumulate.`,
      );
    }
  }
  return { positions, bounds };
};

/** Places nodes from left to right, preserving their input order. */
export const layoutRow = (
  nodes: readonly LayoutNode[],
  options: RowLayoutOptions = {},
): LayoutResult => {
  validateNodes(nodes);
  const point = origin(options);
  const nodeGap = gap(options.gap, "gap");
  const align = alignment(options.align);
  const height = maxBy(nodes, (node) => node.height, 0);
  const width = nodes.reduce(
    (total, node, index) => total + node.width + (index === 0 ? 0 : nodeGap),
    0,
  );
  const positions = new Map<string, LayoutPosition>();
  let cursor = point.x;
  for (const node of nodes) {
    positions.set(node.id, {
      x: cursor,
      y: point.y + alignmentOffset(height, node.height, align),
    });
    cursor += node.width + nodeGap;
  }
  return result(positions, { x: point.x, y: point.y, width, height });
};

/** Places nodes from top to bottom, preserving their input order. */
export const layoutColumn = (
  nodes: readonly LayoutNode[],
  options: ColumnLayoutOptions = {},
): LayoutResult => {
  validateNodes(nodes);
  const point = origin(options);
  const nodeGap = gap(options.gap, "gap");
  const align = alignment(options.align);
  const width = maxBy(nodes, (node) => node.width, 0);
  const height = nodes.reduce(
    (total, node, index) => total + node.height + (index === 0 ? 0 : nodeGap),
    0,
  );
  const positions = new Map<string, LayoutPosition>();
  let cursor = point.y;
  for (const node of nodes) {
    positions.set(node.id, {
      x: point.x + alignmentOffset(width, node.width, align),
      y: cursor,
    });
    cursor += node.height + nodeGap;
  }
  return result(positions, { x: point.x, y: point.y, width, height });
};

const treeDirection = (value: unknown): "down" | "right" => {
  const direction = value ?? "down";
  if (direction !== "down" && direction !== "right") {
    throw new LayoutError("INVALID_INPUT", "direction must be down or right.");
  }
  return direction;
};

const treeRoot = (
  nodes: ReadonlyMap<string, LayoutNode>,
  parents: ReadonlyMap<string, string>,
  requestedRoot: string | undefined,
): string => {
  if (requestedRoot !== undefined) {
    if (!nodes.has(requestedRoot)) {
      throw new LayoutError(
        "MISSING_NODE",
        `Unknown tree root: ${requestedRoot}.`,
        requestedRoot,
      );
    }
    return requestedRoot;
  }
  const roots = [...nodes.keys()].filter((id) => !parents.has(id));
  if (roots.length !== 1) {
    throw new LayoutError(
      "INVALID_TREE",
      "Tree layout requires exactly one root when root is not provided.",
    );
  }
  const root = roots[0];
  if (root === undefined) {
    throw new LayoutError(
      "INVALID_TREE",
      "Tree layout requires exactly one root when root is not provided.",
    );
  }
  return root;
};

/**
 * Places a connected, directed tree. Links point from parent to child and
 * their order determines sibling order.
 */
export const layoutTree = (
  nodes: readonly LayoutNode[],
  links: readonly TreeLayoutLink[],
  options: TreeLayoutOptions = {},
): LayoutResult => {
  const byId = validateNodes(nodes);
  if (nodes.length === 0) {
    throw new LayoutError(
      "INVALID_TREE",
      "Tree layout requires at least one node.",
    );
  }
  const point = origin(options);
  const direction = treeDirection(options.direction);
  const levelGap = gap(options.levelGap, "levelGap");
  const siblingGap = gap(options.siblingGap, "siblingGap");
  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();
  const linkKeys = new Set<string>();
  for (const id of byId.keys()) {
    children.set(id, []);
  }
  for (const link of links) {
    if (!validId(link.from) || !validId(link.to)) {
      throw new LayoutError(
        "INVALID_INPUT",
        "Tree links need non-empty string endpoints.",
      );
    }
    if (!byId.has(link.from) || !byId.has(link.to)) {
      const missingId = !byId.has(link.from) ? link.from : link.to;
      throw new LayoutError(
        "MISSING_NODE",
        `Tree link references an unknown node: ${missingId}.`,
        missingId,
      );
    }
    if (link.from === link.to) {
      throw new LayoutError(
        "INVALID_TREE",
        "A tree link cannot be a self-loop.",
      );
    }
    const linkKey = `${link.from}\u0000${link.to}`;
    if (linkKeys.has(linkKey)) {
      throw new LayoutError("INVALID_TREE", "Tree links cannot be duplicated.");
    }
    linkKeys.add(linkKey);
    if (parents.has(link.to)) {
      throw new LayoutError(
        "INVALID_TREE",
        `Tree node ${link.to} has more than one parent.`,
        link.to,
      );
    }
    parents.set(link.to, link.from);
    children.get(link.from)?.push(link.to);
  }
  const root = treeRoot(byId, parents, options.root);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visitStack: TreeFrame[] = [];
  const enter = (id: string): void => {
    if (visiting.has(id)) {
      throw new LayoutError("INVALID_TREE", "Tree links contain a cycle.", id);
    }
    if (visited.has(id)) {
      return;
    }
    visiting.add(id);
    visitStack.push({ id, nextIndex: 0 });
  };
  enter(root);
  while (visitStack.length > 0) {
    const frame = visitStack[visitStack.length - 1];
    if (frame === undefined) {
      break;
    }
    const childIds = children.get(frame.id) ?? [];
    if (frame.nextIndex < childIds.length) {
      const child = childIds[frame.nextIndex];
      frame.nextIndex += 1;
      if (child !== undefined) {
        enter(child);
      }
      continue;
    }
    visitStack.pop();
    visiting.delete(frame.id);
    visited.add(frame.id);
  }
  if (visited.size !== nodes.length) {
    throw new LayoutError(
      "INVALID_TREE",
      "Every tree node must be reachable from the root.",
    );
  }

  const boxes = new Map<string, TreeBox>();
  const measuredBox = (id: string): TreeBox => {
    const box = boxes.get(id);
    if (box === undefined) {
      throw new LayoutError("INVALID_TREE", "Tree measurement failed.", id);
    }
    return box;
  };
  const measureNode = (id: string, childIds: readonly string[]): TreeBox => {
    const node = byId.get(id);
    if (node === undefined) {
      throw new LayoutError("MISSING_NODE", `Unknown layout node: ${id}.`, id);
    }
    const childBoxes = childIds.map(measuredBox);
    if (childBoxes.length === 0) {
      return { width: node.width, height: node.height };
    }
    if (direction === "down") {
      const childWidth = childBoxes.reduce(
        (total, box, index) =>
          total + box.width + (index === 0 ? 0 : siblingGap),
        0,
      );
      return {
        width: Math.max(node.width, childWidth),
        height:
          node.height +
          levelGap +
          maxBy(childBoxes, (child) => child.height, 0),
      };
    }
    const childHeight = childBoxes.reduce(
      (total, box, index) =>
        total + box.height + (index === 0 ? 0 : siblingGap),
      0,
    );
    return {
      width:
        node.width + levelGap + maxBy(childBoxes, (child) => child.width, 0),
      height: Math.max(node.height, childHeight),
    };
  };

  const measureStack: TreeFrame[] = [{ id: root, nextIndex: 0 }];
  while (measureStack.length > 0) {
    const frame = measureStack[measureStack.length - 1];
    if (frame === undefined) {
      break;
    }
    const childIds = children.get(frame.id) ?? [];
    if (frame.nextIndex < childIds.length) {
      const child = childIds[frame.nextIndex];
      frame.nextIndex += 1;
      if (child !== undefined) {
        measureStack.push({ id: child, nextIndex: 0 });
      }
      continue;
    }
    measureStack.pop();
    boxes.set(frame.id, measureNode(frame.id, childIds));
  }
  const rootBox = measuredBox(root);
  const positions = new Map<string, LayoutPosition>();
  const placeStack: PlaceFrame[] = [{ id: root, boxX: point.x, boxY: point.y }];
  while (placeStack.length > 0) {
    const frame = placeStack.pop();
    if (frame === undefined) {
      break;
    }
    const node = byId.get(frame.id);
    if (node === undefined) {
      throw new LayoutError(
        "INVALID_TREE",
        "Tree measurement failed.",
        frame.id,
      );
    }
    const box = measuredBox(frame.id);
    const childIds = children.get(frame.id) ?? [];
    const pending: PlaceFrame[] = [];
    if (direction === "down") {
      positions.set(frame.id, {
        x: frame.boxX + (box.width - node.width) / 2,
        y: frame.boxY,
      });
      const childWidth = childIds.reduce(
        (total, childId, index) =>
          total + measuredBox(childId).width + (index === 0 ? 0 : siblingGap),
        0,
      );
      let cursor = frame.boxX + (box.width - childWidth) / 2;
      for (const childId of childIds) {
        pending.push({
          id: childId,
          boxX: cursor,
          boxY: frame.boxY + node.height + levelGap,
        });
        cursor += measuredBox(childId).width + siblingGap;
      }
    } else {
      positions.set(frame.id, {
        x: frame.boxX,
        y: frame.boxY + (box.height - node.height) / 2,
      });
      const childHeight = childIds.reduce(
        (total, childId, index) =>
          total + measuredBox(childId).height + (index === 0 ? 0 : siblingGap),
        0,
      );
      let cursor = frame.boxY + (box.height - childHeight) / 2;
      for (const childId of childIds) {
        pending.push({
          id: childId,
          boxX: frame.boxX + node.width + levelGap,
          boxY: cursor,
        });
        cursor += measuredBox(childId).height + siblingGap;
      }
    }
    // Reversed so that the first child is popped first, preserving the
    // pre-order insertion order of `positions`.
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const next = pending[index];
      if (next !== undefined) {
        placeStack.push(next);
      }
    }
  }
  return result(positions, {
    x: point.x,
    y: point.y,
    width: rootBox.width,
    height: rootBox.height,
  });
};

/** Places nodes around a circle in input order. Angles are expressed in degrees. */
export const layoutRadial = (
  nodes: readonly LayoutNode[],
  options: RadialLayoutOptions = {},
): LayoutResult => {
  validateNodes(nodes);
  const centerX = finite(options.centerX ?? 0, "centerX");
  const centerY = finite(options.centerY ?? 0, "centerY");
  const radius = nonNegative(options.radius ?? 160, "radius");
  const startDegrees = finite(
    options.startAngleDegrees ?? -90,
    "startAngleDegrees",
  );
  const sweepDegrees = finite(
    options.sweepAngleDegrees ?? 360,
    "sweepAngleDegrees",
  );
  if (Math.abs(sweepDegrees) > 360) {
    throw new LayoutError(
      "INVALID_INPUT",
      "sweepAngleDegrees must be between -360 and 360.",
    );
  }
  // A full circle in either direction excludes its endpoint, so the last node
  // does not land on top of the first one. Narrower arcs include both ends.
  const fullCircle = Math.abs(sweepDegrees) === 360;
  const positions = new Map<string, LayoutPosition>();
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const [index, node] of nodes.entries()) {
    const progress =
      nodes.length <= 1
        ? 0
        : fullCircle
          ? index / nodes.length
          : index / (nodes.length - 1);
    const angle = ((startDegrees + sweepDegrees * progress) * Math.PI) / 180;
    const x = centerX + Math.cos(angle) * radius - node.width / 2;
    const y = centerY + Math.sin(angle) * radius - node.height / 2;
    positions.set(node.id, { x, y });
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + node.width);
    bottom = Math.max(bottom, y + node.height);
  }
  if (nodes.length === 0) {
    return result(positions, { x: centerX, y: centerY, width: 0, height: 0 });
  }
  return result(positions, {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
};

/** Returns copies of nodes with the positions from a layout result applied. */
export const applyLayout = <T extends LayoutNode>(
  nodes: readonly T[],
  layout: LayoutResult,
): readonly (T & LayoutPosition)[] =>
  nodes.map((node) => {
    const position = layout.positions.get(node.id);
    if (position === undefined) {
      throw new LayoutError(
        "MISSING_NODE",
        `Layout result has no position for node: ${node.id}.`,
        node.id,
      );
    }
    return { ...node, ...position };
  });
