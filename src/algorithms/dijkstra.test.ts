import { describe, expect, it, vi } from "vitest";

import { GraphError, createGraph, dijkstra } from "../index.js";
import type { GraphEdge, GraphNode, ShortestPathResult } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const weightedEdge = (
  id: string,
  from: string,
  to: string,
  weight: number,
): GraphEdge<number> => ({ id, from, to, data: weight });

const graph = createGraph({
  nodes: ["a", "b", "c", "d", "isolated"].map(node),
  edges: [
    weightedEdge("a-b", "a", "b", 2),
    weightedEdge("a-c", "a", "c", 1),
    weightedEdge("a-c-parallel", "a", "c", 3),
    weightedEdge("c-b", "c", "b", 0.5),
    weightedEdge("b-d", "b", "d", 2),
    weightedEdge("c-d", "c", "d", 10),
    weightedEdge("a-d", "a", "d", 5),
    weightedEdge("d-loop", "d", "d", 0),
  ],
});

const nodeIds = (
  result: ShortestPathResult<string, number>,
): readonly string[] => result.nodes.map(({ id }) => id);

const edgeIds = (
  result: ShortestPathResult<string, number>,
): readonly string[] => result.edges.map(({ id }) => id);

describe("dijkstra", () => {
  it("finds a minimum-weight path", () => {
    const result = dijkstra(graph, "a", "d", ({ data }) => data);

    expect(result).toBeDefined();

    if (result !== undefined) {
      expect(nodeIds(result)).toEqual(["a", "c", "b", "d"]);
      expect(edgeIds(result)).toEqual(["a-c", "c-b", "b-d"]);
      expect(result.distance).toBe(3.5);
    }
  });

  it("keeps the first equal-distance alternative", () => {
    const tied = createGraph({
      nodes: ["a", "b", "c", "d"].map(node),
      edges: [
        weightedEdge("a-b", "a", "b", 1),
        weightedEdge("a-c", "a", "c", 1),
        weightedEdge("b-d", "b", "d", 1),
        weightedEdge("c-d", "c", "d", 1),
      ],
    });

    const result = dijkstra(tied, "a", "d", ({ data }) => data);

    expect(result).toBeDefined();

    if (result !== undefined) {
      expect(edgeIds(result)).toEqual(["a-b", "b-d"]);
    }
  });

  it("returns zero for the same endpoint and validates every weight once", () => {
    const getWeight = vi.fn(({ data }: GraphEdge<number>) => data);
    const result = dijkstra(graph, "a", "a", getWeight);

    expect(result).toEqual({
      nodes: [{ id: "a", data: "a" }],
      edges: [],
      distance: 0,
    });
    expect(getWeight).toHaveBeenCalledTimes(graph.edgeCount);
  });

  it("returns undefined for disconnected endpoints", () => {
    expect(
      dijkstra(graph, "a", "isolated", ({ data }) => data),
    ).toBeUndefined();
  });

  it("handles stale queue entries after finding a better route", () => {
    const stale = createGraph({
      nodes: ["a", "b", "c", "isolated"].map(node),
      edges: [
        weightedEdge("a-b", "a", "b", 10),
        weightedEdge("a-c", "a", "c", 1),
        weightedEdge("c-b", "c", "b", 1),
      ],
    });

    expect(
      dijkstra(stale, "a", "isolated", ({ data }) => data),
    ).toBeUndefined();
  });

  it.each([
    ["negative", -1],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
  ])("rejects %s weights", (_label, invalidWeight) => {
    const invalid = createGraph({
      nodes: [node("a"), node("b"), node("isolated")],
      edges: [
        weightedEdge("a-b", "a", "b", 1),
        weightedEdge("invalid", "isolated", "isolated", invalidWeight),
      ],
    });

    expect(() => dijkstra(invalid, "a", "b", ({ data }) => data)).toThrow(
      GraphError,
    );

    try {
      dijkstra(invalid, "a", "b", ({ data }) => data);
    } catch (error: unknown) {
      if (!(error instanceof GraphError)) {
        throw error;
      }

      expect(error).toMatchObject({
        code: "INVALID_WEIGHT",
        id: "invalid",
      });
    }
  });

  it("reports accumulated distance overflow", () => {
    const overflow = createGraph({
      nodes: ["a", "b", "c"].map(node),
      edges: [
        weightedEdge("a-b", "a", "b", Number.MAX_VALUE),
        weightedEdge("b-c", "b", "c", Number.MAX_VALUE),
      ],
    });

    expect(() => dijkstra(overflow, "a", "c", ({ data }) => data)).toThrow(
      GraphError,
    );

    try {
      dijkstra(overflow, "a", "c", ({ data }) => data);
    } catch (error: unknown) {
      if (!(error instanceof GraphError)) {
        throw error;
      }

      expect(error).toMatchObject({
        code: "DISTANCE_OVERFLOW",
        id: "b-c",
      });
    }
  });

  it("propagates exceptions from the weight function", () => {
    const cause = new Error("consumer failure");

    expect(() =>
      dijkstra(graph, "a", "d", () => {
        throw cause;
      }),
    ).toThrow(cause);
  });

  it("rejects missing endpoints", () => {
    expect(() => dijkstra(graph, "missing", "a", ({ data }) => data)).toThrow(
      GraphError,
    );
    expect(() => dijkstra(graph, "a", "missing", ({ data }) => data)).toThrow(
      GraphError,
    );
  });
});
