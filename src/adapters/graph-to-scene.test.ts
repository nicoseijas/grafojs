import { describe, expect, it } from "vitest";

import { createGraph, getNodes } from "../core/graph.js";
import { layoutRow } from "../layout/layout.js";
import { VisualError } from "../visual/errors.js";
import { graphToVisualScene } from "./graph-to-scene.js";

const graph = createGraph({
  nodes: [
    { id: "client", data: { label: "Client" } },
    { id: "api", data: { label: "API" } },
  ],
  edges: [
    { id: "client-api", from: "client", to: "api", data: { kind: "call" } },
  ],
});

describe("graphToVisualScene", () => {
  it("preserves graph topology while mapping visual presentation", () => {
    const positions = layoutRow(
      getNodes(graph).map((node) => ({ id: node.id, width: 140, height: 72 })),
      { x: 40, y: 120, gap: 80 },
    ).positions;
    const scene = graphToVisualScene(graph, {
      width: 480,
      height: 280,
      ariaLabel: "Client API flow",
      node: (node, index) => {
        const position = positions.get(node.id);
        if (position === undefined) {
          throw new Error("Missing layout position.");
        }
        return {
          ...position,
          width: 140,
          height: 72,
          label: node.data.label,
          shape: index === 0 ? "pill" : "hexagon",
        };
      },
      edge: (edge) => ({
        label: edge.data.kind,
        routing: "orthogonal",
      }),
    });

    expect(scene).toEqual({
      width: 480,
      height: 280,
      ariaLabel: "Client API flow",
      nodes: [
        {
          id: "client",
          x: 40,
          y: 120,
          width: 140,
          height: 72,
          label: "Client",
          shape: "pill",
        },
        {
          id: "api",
          x: 260,
          y: 120,
          width: 140,
          height: 72,
          label: "API",
          shape: "hexagon",
        },
      ],
      edges: [
        {
          id: "client-api",
          from: "client",
          to: "api",
          label: "call",
          routing: "orthogonal",
        },
      ],
    });
  });

  it("creates bare visual edges when an edge mapper is omitted", () => {
    const scene = graphToVisualScene(graph, {
      width: 480,
      height: 280,
      node: (node, index) => ({
        x: index * 180,
        y: 80,
        width: 140,
        height: 64,
        label: node.data.label,
      }),
    });

    expect(scene.edges).toEqual([
      { id: "client-api", from: "client", to: "api" },
    ]);
  });

  it("rejects malformed options and visual mappings with stable errors", () => {
    expect(() => graphToVisualScene(graph, {} as never)).toThrow(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(() =>
      graphToVisualScene(graph, {
        width: 480,
        height: 280,
        node: () =>
          ({ x: 0, y: 0, width: 100, height: 40, label: 42 }) as never,
      }),
    ).toThrow(VisualError);
  });
});
