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

const result = (
  positions: ReadonlyMap<string, LayoutPosition>,
  bounds: LayoutBounds,
): LayoutResult => ({ positions, bounds });

/** Places nodes from left to right, preserving their input order. */
export const layoutRow = (
  nodes: readonly LayoutNode[],
  options: RowLayoutOptions = {},
): LayoutResult => {
  validateNodes(nodes);
  const point = origin(options);
  const nodeGap = gap(options.gap, "gap");
  const align = alignment(options.align);
  const height = Math.max(0, ...nodes.map((node) => node.height));
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
  const width = Math.max(0, ...nodes.map((node) => node.width));
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
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      throw new LayoutError("INVALID_TREE", "Tree links contain a cycle.", id);
    }
    if (visited.has(id)) {
      return;
    }
    visiting.add(id);
    for (const child of children.get(id) ?? []) {
      visit(child);
    }
    visiting.delete(id);
    visited.add(id);
  };
  visit(root);
  if (visited.size !== nodes.length) {
    throw new LayoutError(
      "INVALID_TREE",
      "Every tree node must be reachable from the root.",
    );
  }

  const boxes = new Map<string, TreeBox>();
  const measure = (id: string): TreeBox => {
    const node = byId.get(id);
    if (node === undefined) {
      throw new LayoutError("MISSING_NODE", `Unknown layout node: ${id}.`, id);
    }
    const childBoxes = (children.get(id) ?? []).map(measure);
    if (childBoxes.length === 0) {
      const leaf = { width: node.width, height: node.height };
      boxes.set(id, leaf);
      return leaf;
    }
    if (direction === "down") {
      const childWidth = childBoxes.reduce(
        (total, box, index) =>
          total + box.width + (index === 0 ? 0 : siblingGap),
        0,
      );
      const box = {
        width: Math.max(node.width, childWidth),
        height:
          node.height +
          levelGap +
          Math.max(...childBoxes.map((child) => child.height)),
      };
      boxes.set(id, box);
      return box;
    }
    const childHeight = childBoxes.reduce(
      (total, box, index) =>
        total + box.height + (index === 0 ? 0 : siblingGap),
      0,
    );
    const box = {
      width:
        node.width +
        levelGap +
        Math.max(...childBoxes.map((child) => child.width)),
      height: Math.max(node.height, childHeight),
    };
    boxes.set(id, box);
    return box;
  };

  const rootBox = measure(root);
  const positions = new Map<string, LayoutPosition>();
  const place = (id: string, boxX: number, boxY: number): void => {
    const node = byId.get(id);
    const box = boxes.get(id);
    if (node === undefined || box === undefined) {
      throw new LayoutError("INVALID_TREE", "Tree measurement failed.", id);
    }
    const childIds = children.get(id) ?? [];
    if (direction === "down") {
      positions.set(id, {
        x: boxX + (box.width - node.width) / 2,
        y: boxY,
      });
      const childWidth = childIds.reduce(
        (total, childId, index) =>
          total +
          (boxes.get(childId)?.width ?? 0) +
          (index === 0 ? 0 : siblingGap),
        0,
      );
      let cursor = boxX + (box.width - childWidth) / 2;
      for (const childId of childIds) {
        const child = boxes.get(childId);
        if (child === undefined) {
          throw new LayoutError(
            "INVALID_TREE",
            "Tree measurement failed.",
            childId,
          );
        }
        place(childId, cursor, boxY + node.height + levelGap);
        cursor += child.width + siblingGap;
      }
      return;
    }
    positions.set(id, {
      x: boxX,
      y: boxY + (box.height - node.height) / 2,
    });
    const childHeight = childIds.reduce(
      (total, childId, index) =>
        total +
        (boxes.get(childId)?.height ?? 0) +
        (index === 0 ? 0 : siblingGap),
      0,
    );
    let cursor = boxY + (box.height - childHeight) / 2;
    for (const childId of childIds) {
      const child = boxes.get(childId);
      if (child === undefined) {
        throw new LayoutError(
          "INVALID_TREE",
          "Tree measurement failed.",
          childId,
        );
      }
      place(childId, boxX + node.width + levelGap, cursor);
      cursor += child.height + siblingGap;
    }
  };
  place(root, point.x, point.y);
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
  const positions = new Map<string, LayoutPosition>();
  for (const [index, node] of nodes.entries()) {
    const progress =
      nodes.length <= 1
        ? 0
        : sweepDegrees === 360
          ? index / nodes.length
          : index / (nodes.length - 1);
    const angle = ((startDegrees + sweepDegrees * progress) * Math.PI) / 180;
    positions.set(node.id, {
      x: centerX + Math.cos(angle) * radius - node.width / 2,
      y: centerY + Math.sin(angle) * radius - node.height / 2,
    });
  }
  if (nodes.length === 0) {
    return result(positions, { x: centerX, y: centerY, width: 0, height: 0 });
  }
  const horizontal = [...positions.entries()].map(([id, position]) => ({
    position,
    node: byId(nodes, id),
  }));
  const left = Math.min(...horizontal.map(({ position }) => position.x));
  const top = Math.min(...horizontal.map(({ position }) => position.y));
  const right = Math.max(
    ...horizontal.map(({ position, node }) => position.x + node.width),
  );
  const bottom = Math.max(
    ...horizontal.map(({ position, node }) => position.y + node.height),
  );
  return result(positions, {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
};

const byId = (nodes: readonly LayoutNode[], id: string): LayoutNode => {
  const node = nodes.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new LayoutError("MISSING_NODE", `Unknown layout node: ${id}.`, id);
  }
  return node;
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
