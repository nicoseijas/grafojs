import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

import { createSvgGraph } from "../visual/svg-renderer.js";
import { LayoutError } from "./errors.js";
import { fitNodeHeight, fitNodeWidth } from "./fit.js";

const rowsOf = (
  node: {
    readonly label: string;
    readonly tag?: string;
    readonly role?: string;
  },
  height: number,
): readonly number[] => {
  const window = new Window();
  const svg = window.document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as unknown as SVGSVGElement;
  createSvgGraph(svg, {
    width: 400,
    height: 400,
    nodes: [{ id: "n", x: 0, y: 0, width: 300, height, ...node }],
    edges: [],
  });
  return [...svg.querySelectorAll('[data-node-id="n"] text')].map((text) =>
    Number(text.getAttribute("y")),
  );
};

describe("fitNodeHeight", () => {
  it("puts the same space above the first row and below the last row", () => {
    const cases = [
      { label: "Store" },
      { label: "Store", tag: "class" },
      { label: "Store", tag: "class", role: "Subject" },
      { label: "Store", role: "Subject" },
      { label: "Inside\nthe navigator", tag: "class", role: "Subject" },
    ];

    for (const node of cases) {
      const height = fitNodeHeight(node);
      const rows = rowsOf(node, height);
      const first = rows[0] ?? 0;
      const last = rows[rows.length - 1] ?? 0;
      const descent =
        node.role !== undefined ? 3 : node.tag !== undefined ? 2 : 3;
      const above = first - 10;
      const below = height - (last + descent);
      expect(above, `space above for ${JSON.stringify(node)}`).toBe(10);
      expect(below, `space below for ${JSON.stringify(node)}`).toBe(10);
    }
  });

  it("grows with each row and with each line of the label", () => {
    const label = fitNodeHeight({ label: "Store" });
    const withTag = fitNodeHeight({ label: "Store", tag: "class" });
    const withRole = fitNodeHeight({
      label: "Store",
      tag: "class",
      role: "Subject",
    });
    const twoLines = fitNodeHeight({
      label: "Store\nof the shop",
      tag: "class",
      role: "Subject",
    });

    expect(label).toBeLessThan(withTag);
    expect(withTag).toBeLessThan(withRole);
    expect(twoLines - withRole).toBe(15.5);
  });

  it("gives a height that the renderer does not need to correct", () => {
    const node = { label: "EmailSubscriber", tag: "channel", role: "Observer" };
    const height = fitNodeHeight(node);
    const rows = rowsOf(node, height);

    expect(rows).toHaveLength(3);
    // A taller node draws the rows at the same place, which shows that the
    // fitted height never makes the renderer pull the role up.
    expect(rows).toStrictEqual(rowsOf(node, height + 100));
    expect((rows[2] ?? 0) - (rows[1] ?? 0)).toBe(18);
    // The fitted height keeps 3 pixels for the part of the role below its
    // baseline, so the role holds its place until the node loses those too.
    const role = rows[2] ?? 0;
    expect(rowsOf(node, role + 10)[2]).toBe(role);
    expect(rowsOf(node, role + 9)[2]).toBe(role - 1);
    expect(height).toBe(role + 13);
  });

  it("rejects a node without a string label", () => {
    expect(() =>
      fitNodeHeight({ label: 3 } as unknown as { label: string }),
    ).toThrow(LayoutError);
  });
});

describe("fitNodeWidth", () => {
  it("fits the longest row of a monospace label", () => {
    const width = fitNodeWidth({ label: "Store" });

    // 5 characters at 13.5 pixels and a ratio of 0.6, plus 22 on each side.
    expect(width).toBe(5 * 13.5 * 0.6 + 44);
  });

  it("takes the row that is widest, not the row with more characters", () => {
    const longTag = fitNodeWidth({ label: "Store", tag: "aaaaaaaaaaaa" });
    const longLabel = fitNodeWidth({ label: "Storestore", tag: "a" });

    expect(longTag).toBe(12 * 10 * 0.6 + 44);
    expect(longLabel).toBe(10 * 13.5 * 0.6 + 44);
  });

  it("counts the prefix of the role", () => {
    const withDefault = fitNodeWidth({ label: "a", role: "Subject" });
    const withPrefix = fitNodeWidth(
      { label: "a", role: "Subject" },
      {
        rolePrefix: "rol",
      },
    );

    expect(withDefault).toBeGreaterThan(withPrefix);
  });

  it("gives a polygon more width than a rectangle", () => {
    const node = { label: "EmailSubscriber", tag: "channel" };

    expect(fitNodeWidth({ ...node, shape: "diamond" })).toBeGreaterThan(
      fitNodeWidth({ ...node, shape: "rect" }),
    );
    expect(fitNodeWidth({ ...node, shape: "hexagon" })).toBeGreaterThan(
      fitNodeWidth({ ...node, shape: "rect" }),
    );
  });

  it("follows the ratio of the font", () => {
    const wide = fitNodeWidth({ label: "Store" }, { charWidthRatio: 1 });
    const narrow = fitNodeWidth({ label: "Store" }, { charWidthRatio: 0.5 });

    expect(wide).toBeGreaterThan(narrow);
    expect(() =>
      fitNodeWidth({ label: "Store" }, { charWidthRatio: 0 }),
    ).toThrow(LayoutError);
  });

  it("keeps the text of every shape inside the node", () => {
    const node = { label: "EmailSubscriber", tag: "channel", role: "Observer" };
    const shapes = ["rect", "pill", "ellipse", "diamond", "hexagon"] as const;
    const window = new Window();

    for (const shape of shapes) {
      const svg = window.document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      ) as unknown as SVGSVGElement;
      const width = fitNodeWidth({ ...node, shape });
      const height = fitNodeHeight(node);
      createSvgGraph(svg, {
        width: width + 100,
        height: height + 100,
        nodes: [{ id: "n", x: 0, y: 0, width, height, shape, ...node }],
        edges: [],
      });

      const textX = Number(
        svg.querySelector('[data-node-id="n"] text')?.getAttribute("x"),
      );
      const widest = "EmailSubscriber".length * 13.5 * 0.6;
      expect(
        textX + widest,
        `${shape} keeps its text inside`,
      ).toBeLessThanOrEqual(width);
    }
  });
});
