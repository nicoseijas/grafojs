import { describe, expect, it } from "vitest";

import { LayoutError } from "./errors.js";
import {
  applyLayout,
  layoutColumn,
  layoutRadial,
  layoutRow,
  layoutTree,
} from "./layout.js";

const nodes = [
  { id: "a", width: 100, height: 40 },
  { id: "b", width: 60, height: 80 },
  { id: "c", width: 80, height: 60 },
] as const;

describe("linear layouts", () => {
  it("lays a row out in input order with cross-axis alignment", () => {
    const layout = layoutRow(nodes, { x: 10, y: 20, gap: 10 });

    expect([...layout.positions]).toEqual([
      ["a", { x: 10, y: 40 }],
      ["b", { x: 120, y: 20 }],
      ["c", { x: 190, y: 30 }],
    ]);
    expect(layout.bounds).toEqual({ x: 10, y: 20, width: 260, height: 80 });
  });

  it("lays a column out with end alignment", () => {
    const layout = layoutColumn(nodes, { x: 10, y: 20, gap: 10, align: "end" });

    expect([...layout.positions]).toEqual([
      ["a", { x: 10, y: 20 }],
      ["b", { x: 50, y: 70 }],
      ["c", { x: 30, y: 160 }],
    ]);
    expect(layout.bounds).toEqual({ x: 10, y: 20, width: 100, height: 200 });
  });
});

describe("tree layout", () => {
  const treeNodes = [
    { id: "root", width: 100, height: 40 },
    { id: "left", width: 80, height: 30 },
    { id: "right", width: 120, height: 50 },
  ] as const;
  const treeLinks = [
    { from: "root", to: "left" },
    { from: "root", to: "right" },
  ] as const;

  it("centers a parent above its child subtrees", () => {
    const layout = layoutTree(treeNodes, treeLinks, {
      levelGap: 20,
      siblingGap: 30,
    });

    expect([...layout.positions]).toEqual([
      ["root", { x: 65, y: 0 }],
      ["left", { x: 0, y: 60 }],
      ["right", { x: 110, y: 60 }],
    ]);
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 230, height: 110 });
  });

  it("can place a tree from left to right", () => {
    const layout = layoutTree(treeNodes, treeLinks, {
      direction: "right",
      levelGap: 20,
      siblingGap: 30,
    });

    expect([...layout.positions]).toEqual([
      ["root", { x: 0, y: 35 }],
      ["left", { x: 120, y: 0 }],
      ["right", { x: 120, y: 60 }],
    ]);
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 240, height: 110 });
  });

  it("rejects disconnected graphs and nodes with multiple parents", () => {
    expect(() =>
      layoutTree(
        treeNodes,
        [
          { from: "root", to: "left" },
          { from: "right", to: "left" },
        ],
        { root: "root" },
      ),
    ).toThrow(LayoutError);
    expect(() =>
      layoutTree(treeNodes, [{ from: "root", to: "left" }], {
        root: "root",
      }),
    ).toThrow("Every tree node must be reachable from the root.");
  });

  it("rejects invalid tree directions and cycles", () => {
    expect(() =>
      layoutTree(treeNodes, treeLinks, { direction: "diagonal" as never }),
    ).toThrow("direction must be down or right.");
    expect(() =>
      layoutTree(
        [
          { id: "a", width: 40, height: 40 },
          { id: "b", width: 40, height: 40 },
        ],
        [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
        ],
        { root: "a" },
      ),
    ).toThrow("Tree links contain a cycle.");
  });
});

describe("radial layout", () => {
  it("places nodes around a requested arc", () => {
    const layout = layoutRadial(
      [
        { id: "left", width: 20, height: 20 },
        { id: "right", width: 20, height: 20 },
      ],
      {
        centerX: 100,
        centerY: 100,
        radius: 50,
        startAngleDegrees: 0,
        sweepAngleDegrees: 180,
      },
    );

    expect([...layout.positions]).toEqual([
      ["left", { x: 140, y: 90 }],
      ["right", { x: 40, y: 90 }],
    ]);
    expect(layout.bounds).toEqual({ x: 40, y: 90, width: 120, height: 20 });
  });

  it("returns empty bounds around the requested center", () => {
    expect(layoutRadial([], { centerX: 40, centerY: 60 })).toEqual({
      positions: new Map(),
      bounds: { x: 40, y: 60, width: 0, height: 0 },
    });
  });
});

describe("layout robustness", () => {
  const chain = (
    length: number,
  ): {
    readonly nodes: readonly { id: string; width: number; height: number }[];
    readonly links: readonly { from: string; to: string }[];
  } => {
    const chainNodes = [];
    const chainLinks = [];
    for (let index = 0; index < length; index += 1) {
      chainNodes.push({ id: `n${String(index)}`, width: 40, height: 20 });
      if (index > 0) {
        chainLinks.push({
          from: `n${String(index - 1)}`,
          to: `n${String(index)}`,
        });
      }
    }
    return { nodes: chainNodes, links: chainLinks };
  };

  it("places a deep tree without exhausting the call stack", () => {
    const deep = chain(20000);
    const layout = layoutTree(deep.nodes, deep.links, { root: "n0" });

    expect(layout.positions.size).toBe(20000);
    expect(layout.positions.get("n19999")).toEqual({ x: 0, y: 19999 * 68 });
  });

  it("detects a cycle in a deep chain without exhausting the call stack", () => {
    const deep = chain(20000);

    expect(() =>
      layoutTree(deep.nodes, [...deep.links, { from: "n19999", to: "n0" }], {
        root: "n0",
      }),
    ).toThrow("Tree links contain a cycle.");
  });

  it("lays out a very wide row and column", () => {
    const wide = chain(200000).nodes;

    expect(layoutRow(wide, { gap: 0 }).bounds.width).toBe(200000 * 40);
    expect(layoutColumn(wide, { gap: 0 }).bounds.height).toBe(200000 * 20);
  });

  it("rejects accumulated positions that are no longer finite", () => {
    const huge = [
      { id: "a", width: 1e308, height: 20 },
      { id: "b", width: 1e308, height: 20 },
      { id: "c", width: 1e308, height: 20 },
    ];

    expect(() => layoutRow(huge)).toThrow(LayoutError);
    expect(() => layoutRow(huge)).toThrow(/non-finite/);
    expect(() =>
      layoutColumn(huge.map((node) => ({ ...node, height: 1e308 }))),
    ).toThrow(/non-finite/);
  });

  it("rejects a tree whose accumulated geometry is no longer finite", () => {
    expect(() =>
      layoutTree(
        [
          { id: "root", width: 1e308, height: 20 },
          { id: "left", width: 1e308, height: 20 },
          { id: "right", width: 1e308, height: 20 },
        ],
        [
          { from: "root", to: "left" },
          { from: "root", to: "right" },
        ],
        { root: "root" },
      ),
    ).toThrow(/non-finite/);
  });

  it("treats a negative full circle as a full circle", () => {
    const ring = (sweepAngleDegrees: number): readonly string[] =>
      [
        ...layoutRadial(
          [
            { id: "a", width: 20, height: 20 },
            { id: "b", width: 20, height: 20 },
            { id: "c", width: 20, height: 20 },
          ],
          { radius: 100, sweepAngleDegrees },
        ).positions.values(),
      ].map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`);

    const clockwise = ring(360);
    const counterClockwise = ring(-360);

    expect(new Set(clockwise).size).toBe(3);
    expect(new Set(counterClockwise).size).toBe(3);
    expect(counterClockwise[0]).toBe(clockwise[0]);
  });

  it("rejects a sweep wider than a full circle", () => {
    expect(() =>
      layoutRadial([{ id: "a", width: 20, height: 20 }], {
        sweepAngleDegrees: 720,
      }),
    ).toThrow("sweepAngleDegrees must be between -360 and 360.");
  });
});

describe("applyLayout", () => {
  it("returns positioned copies without mutating visual-node-like input", () => {
    const input = [
      { id: "a", x: 999, y: 999, width: 100, height: 40, label: "A" },
    ];
    const positioned = applyLayout(input, layoutRow(input, { x: 12, y: 18 }));

    expect(positioned).toEqual([
      { id: "a", x: 12, y: 18, width: 100, height: 40, label: "A" },
    ]);
    expect(input[0]).toMatchObject({ x: 999, y: 999 });
  });

  it("rejects malformed geometry", () => {
    expect(() => layoutRow([{ id: "a", width: 0, height: 40 }])).toThrow(
      "Layout node width and height must be greater than zero.",
    );
  });

  it("rejects invalid alignments and incomplete layout results", () => {
    expect(() => layoutRow(nodes, { align: "diagonal" as never })).toThrow(
      "align must be start, center, or end.",
    );
    expect(() =>
      applyLayout(nodes, {
        positions: new Map(),
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      }),
    ).toThrow("Layout result has no position for node: a.");
  });
});
