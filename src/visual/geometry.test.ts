import { describe, expect, it } from "vitest";

import { VisualError } from "./errors.js";
import {
  curvePath,
  edgeCurve,
  edgePath,
  pathData,
  pointOnCurve,
  pointOnPath,
} from "./geometry.js";
import type { VisualEdge, VisualNode } from "./types.js";

const left: VisualNode = {
  id: "left",
  x: 0,
  y: 20,
  width: 100,
  height: 60,
  label: "Left",
};

const right: VisualNode = {
  id: "right",
  x: 300,
  y: 20,
  width: 100,
  height: 60,
  label: "Right",
};

const edge: VisualEdge = {
  id: "left-right",
  from: "left",
  to: "right",
  bend: -20,
};

describe("visual edge geometry", () => {
  it("connects node borders with a deterministic quadratic curve", () => {
    const curve = edgeCurve(edge, left, right);

    expect(curve).toEqual({
      start: { x: 100, y: 50 },
      control: { x: 200, y: 30 },
      end: { x: 300, y: 50 },
    });
    expect(curvePath(curve)).toBe("M 100 50 Q 200 30 300 50");
  });

  it("computes points along the curve without browser path APIs", () => {
    const curve = edgeCurve(edge, left, right);

    expect(pointOnCurve(curve, 0)).toEqual(curve.start);
    expect(pointOnCurve(curve, 0.5)).toEqual({ x: 200, y: 40 });
    expect(pointOnCurve(curve, 1)).toEqual(curve.end);
  });

  it("handles overlapping node centers", () => {
    const curve = edgeCurve({ id: "loop", from: "left", to: "same" }, left, {
      ...left,
      id: "same",
    });

    expect(curve.start).toEqual({ x: 50, y: 50 });
    expect(curve.end).toEqual({ x: 50, y: 50 });
  });

  it("uses shape borders for straight routes", () => {
    const ellipse: VisualNode = { ...left, shape: "ellipse" };
    const target: VisualNode = { ...right, y: 220 };
    const path = edgePath(
      { id: "ellipse-target", from: "left", to: "right", routing: "straight" },
      ellipse,
      target,
    );

    expect("kind" in path).toBe(true);
    if (!("kind" in path)) {
      throw new Error("Expected a polyline path.");
    }
    expect(path.points[0]).toMatchObject({});
    expect(path.points[0]?.x).toBeCloseTo(83.45, 2);
    expect(path.points[0]?.y).toBeCloseTo(72.3, 2);
    expect(pathData(path)).toMatch(/^M /);
  });

  it("creates and samples orthogonal routes", () => {
    const target: VisualNode = { ...right, y: 220 };
    const path = edgePath(
      { id: "orthogonal", from: "left", to: "right", routing: "orthogonal" },
      left,
      target,
    );

    expect(path).toEqual({
      kind: "polyline",
      points: [
        { x: 100, y: 50 },
        { x: 200, y: 50 },
        { x: 200, y: 250 },
        { x: 300, y: 250 },
      ],
    });
    expect(pathData(path)).toBe("M 100 50 L 200 50 L 200 250 L 300 250");
    expect(pointOnPath(path, 0.5)).toEqual({ x: 200, y: 150 });
  });

  it("routes vertically and intersects polygon node borders", () => {
    const below: VisualNode = { ...left, id: "below", x: 40, y: 260 };
    const vertical = edgePath(
      { id: "vertical", from: "left", to: "below", routing: "orthogonal" },
      left,
      below,
    );
    const diamond: VisualNode = { ...left, shape: "diamond" };
    const hexagon: VisualNode = { ...right, shape: "hexagon" };
    const polygonRoute = edgePath(
      { id: "polygon", from: "left", to: "right", routing: "straight" },
      diamond,
      hexagon,
    );

    expect(vertical).toMatchObject({ kind: "polyline" });
    expect("kind" in vertical && vertical.points).toHaveLength(4);
    expect("kind" in polygonRoute && polygonRoute.points[0]).toEqual({
      x: 100,
      y: 50,
    });
    expect("kind" in polygonRoute && polygonRoute.points[1]).toEqual({
      x: 300,
      y: 50,
    });
  });

  it("refuses to emit a path whose computed points overflow to NaN", () => {
    const far: VisualNode = {
      id: "far",
      x: 1e308,
      y: 20,
      width: 100,
      height: 60,
      label: "Far",
    };
    const near: VisualNode = { ...far, id: "near", x: -1e308 };

    for (const routing of ["curve", "straight"] as const) {
      expect(() =>
        edgePath({ id: "wide", from: "near", to: "far", routing }, near, far),
      ).toThrow(VisualError);
    }
    expect(() =>
      edgePath({ id: "wide", from: "near", to: "far" }, near, far),
    ).toThrow("non-finite");

    // Orthogonal routing subtracts against a midpoint instead of the opposite
    // centre, so it stays finite here and must not be rejected.
    const orthogonal = edgePath(
      { id: "wide", from: "near", to: "far", routing: "orthogonal" },
      near,
      far,
    );
    expect(pathData(orthogonal)).not.toContain("NaN");
  });
});
