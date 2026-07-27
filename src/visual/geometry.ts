import { VisualError } from "./errors.js";
import type { VisualEdge, VisualNode } from "./types.js";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface QuadraticCurve {
  readonly start: Point;
  readonly control: Point;
  readonly end: Point;
}

export interface PolylinePath {
  readonly kind: "polyline";
  readonly points: readonly Point[];
}

export type EdgePath = QuadraticCurve | PolylinePath;

const center = (node: VisualNode): Point => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});

const rectangleBorder = (node: VisualNode, toward: Point): Point => {
  const from = center(node);
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) {
    return from;
  }
  const scaleX =
    dx === 0 ? Number.POSITIVE_INFINITY : node.width / 2 / Math.abs(dx);
  const scaleY =
    dy === 0 ? Number.POSITIVE_INFINITY : node.height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: from.x + dx * scale, y: from.y + dy * scale };
};

const polygonBorder = (
  node: VisualNode,
  toward: Point,
  vertices: readonly Point[],
): Point => {
  const from = center(node);
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) {
    return from;
  }
  let closest: { readonly progress: number; readonly point: Point } | undefined;
  for (const [index, start] of vertices.entries()) {
    const end = vertices[(index + 1) % vertices.length];
    if (end === undefined) {
      continue;
    }
    const edgeX = end.x - start.x;
    const edgeY = end.y - start.y;
    const denominator = dx * edgeY - dy * edgeX;
    if (denominator === 0) {
      continue;
    }
    const relativeX = start.x - from.x;
    const relativeY = start.y - from.y;
    const progress = (relativeX * edgeY - relativeY * edgeX) / denominator;
    const edgeProgress = (relativeX * dy - relativeY * dx) / denominator;
    if (
      progress >= 0 &&
      edgeProgress >= 0 &&
      edgeProgress <= 1 &&
      (closest === undefined || progress < closest.progress)
    ) {
      closest = {
        progress,
        point: { x: from.x + dx * progress, y: from.y + dy * progress },
      };
    }
  }
  return closest?.point ?? from;
};

const ellipseBorder = (node: VisualNode, toward: Point): Point => {
  const from = center(node);
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) {
    return from;
  }
  const radiusX = node.width / 2;
  const radiusY = node.height / 2;
  const scale = 1 / Math.sqrt((dx / radiusX) ** 2 + (dy / radiusY) ** 2);
  return { x: from.x + dx * scale, y: from.y + dy * scale };
};

const verticesFor = (node: VisualNode): readonly Point[] | undefined => {
  const x = node.x;
  const y = node.y;
  const width = node.width;
  const height = node.height;
  if (node.shape === "diamond") {
    return [
      { x: x + width / 2, y },
      { x: x + width, y: y + height / 2 },
      { x: x + width / 2, y: y + height },
      { x, y: y + height / 2 },
    ];
  }
  if (node.shape === "hexagon") {
    const inset = width * 0.22;
    return [
      { x: x + inset, y },
      { x: x + width - inset, y },
      { x: x + width, y: y + height / 2 },
      { x: x + width - inset, y: y + height },
      { x: x + inset, y: y + height },
      { x, y: y + height / 2 },
    ];
  }
  return undefined;
};

const border = (node: VisualNode, toward: Point): Point => {
  if (node.shape === "ellipse") {
    return ellipseBorder(node, toward);
  }
  const vertices = verticesFor(node);
  if (vertices !== undefined) {
    return polygonBorder(node, toward, vertices);
  }
  return rectangleBorder(node, toward);
};

export const edgeCurve = (
  edge: VisualEdge,
  from: VisualNode,
  to: VisualNode,
): QuadraticCurve => {
  const start = border(from, center(to));
  const end = border(to, center(from));
  return {
    start,
    control: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 + (edge.bend ?? -14),
    },
    end,
  };
};

const samePoint = (left: Point, right: Point): boolean =>
  left.x === right.x && left.y === right.y;

const withoutRepeatedPoints = (points: readonly Point[]): readonly Point[] =>
  points.filter((point, index) => {
    const previous = points[index - 1];
    return previous === undefined || !samePoint(point, previous);
  });

const orthogonalPath = (from: VisualNode, to: VisualNode): PolylinePath => {
  const fromCenter = center(from);
  const toCenter = center(to);
  if (
    Math.abs(toCenter.x - fromCenter.x) >= Math.abs(toCenter.y - fromCenter.y)
  ) {
    const middleX = (fromCenter.x + toCenter.x) / 2;
    const start = border(from, { x: middleX, y: fromCenter.y });
    const end = border(to, { x: middleX, y: toCenter.y });
    return {
      kind: "polyline",
      points: withoutRepeatedPoints([
        start,
        { x: middleX, y: start.y },
        { x: middleX, y: end.y },
        end,
      ]),
    };
  }
  const middleY = (fromCenter.y + toCenter.y) / 2;
  const start = border(from, { x: fromCenter.x, y: middleY });
  const end = border(to, { x: toCenter.x, y: middleY });
  return {
    kind: "polyline",
    points: withoutRepeatedPoints([
      start,
      { x: start.x, y: middleY },
      { x: end.x, y: middleY },
      end,
    ]),
  };
};

/**
 * Scene coordinates are validated one by one, but their differences can still
 * overflow: `1e308 - -1e308` is `Infinity`, and scaling that by zero yields
 * `NaN`. A `NaN` inside `d` makes a browser drop the whole path silently, so
 * the geometry refuses to emit one instead.
 */
const assertFinitePath = (edge: VisualEdge, path: EdgePath): EdgePath => {
  const points =
    "kind" in path ? path.points : [path.start, path.control, path.end];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new VisualError(
        "INVALID_GEOMETRY",
        `Visual edge ${edge.id} produced a non-finite path. Node coordinates are too far apart to subtract.`,
        { entity: "edge", id: edge.id },
      );
    }
  }
  return path;
};

export const edgePath = (
  edge: VisualEdge,
  from: VisualNode,
  to: VisualNode,
): EdgePath => {
  if ((edge.routing ?? "curve") === "curve") {
    return assertFinitePath(edge, edgeCurve(edge, from, to));
  }
  if (edge.routing === "orthogonal") {
    return assertFinitePath(edge, orthogonalPath(from, to));
  }
  return assertFinitePath(edge, {
    kind: "polyline",
    points: [border(from, center(to)), border(to, center(from))],
  });
};

export const pointOnCurve = (
  curve: QuadraticCurve,
  progress: number,
): Point => {
  const inverse = 1 - progress;
  return {
    x:
      inverse * inverse * curve.start.x +
      2 * inverse * progress * curve.control.x +
      progress * progress * curve.end.x,
    y:
      inverse * inverse * curve.start.y +
      2 * inverse * progress * curve.control.y +
      progress * progress * curve.end.y,
  };
};

export const curvePath = (curve: QuadraticCurve): string =>
  [
    "M",
    String(curve.start.x),
    String(curve.start.y),
    "Q",
    String(curve.control.x),
    String(curve.control.y),
    String(curve.end.x),
    String(curve.end.y),
  ].join(" ");

export const pathData = (path: EdgePath): string => {
  if (!("kind" in path)) {
    return curvePath(path);
  }
  return path.points
    .map((point, index) =>
      [index === 0 ? "M" : "L", String(point.x), String(point.y)].join(" "),
    )
    .join(" ");
};

const pointOnPolyline = (points: readonly Point[], progress: number): Point => {
  const segments = points.slice(1).map((end, index) => {
    const start = points[index];
    if (start === undefined) {
      throw new Error("A polyline needs a start point.");
    }
    return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total === 0) {
    return points[0] ?? { x: 0, y: 0 };
  }
  let remaining = total * progress;
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    remaining -= segment.length;
  }
  const last = points.at(-1);
  return last ?? { x: 0, y: 0 };
};

export const pointOnPath = (path: EdgePath, progress: number): Point =>
  "kind" in path
    ? pointOnPolyline(path.points, progress)
    : pointOnCurve(path, progress);
