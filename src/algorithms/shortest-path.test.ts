import { describe, expect, it } from "vitest";

import { GraphError, createGraph, shortestPath } from "../index.js";
import type { GraphNode, ShortestPathResult } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const graph = createGraph({
  nodes: ["a", "b", "c", "d", "isolated"].map(node),
  edges: [
    { id: "a-b-first", from: "a", to: "b", data: undefined },
    { id: "a-b-parallel", from: "a", to: "b", data: undefined },
    { id: "a-c", from: "a", to: "c", data: undefined },
    { id: "b-d", from: "b", to: "d", data: undefined },
    { id: "c-d", from: "c", to: "d", data: undefined },
    { id: "d-a", from: "d", to: "a", data: undefined },
    { id: "b-loop", from: "b", to: "b", data: undefined },
  ],
});

const nodeIds = (
  result: ShortestPathResult<string, undefined>,
): readonly string[] => result.nodes.map(({ id }) => id);

const edgeIds = (
  result: ShortestPathResult<string, undefined>,
): readonly string[] => result.edges.map(({ id }) => id);

describe("shortestPath", () => {
  it("finds a minimum-hop path with deterministic ties", () => {
    const result = shortestPath(graph, "a", "d");

    expect(result).toBeDefined();

    if (result === undefined) {
      return;
    }

    expect(nodeIds(result)).toEqual(["a", "b", "d"]);
    expect(edgeIds(result)).toEqual(["a-b-first", "b-d"]);
    expect(result.distance).toBe(2);
  });

  it("returns a zero-length path from a node to itself", () => {
    const result = shortestPath(graph, "b", "b");

    expect(result).toEqual({
      nodes: [{ id: "b", data: "b" }],
      edges: [],
      distance: 0,
    });
  });

  it("returns undefined for disconnected endpoints", () => {
    expect(shortestPath(graph, "a", "isolated")).toBeUndefined();
    expect(shortestPath(graph, "isolated", "a")).toBeUndefined();
  });

  it("follows edge direction", () => {
    const result = shortestPath(graph, "d", "c");

    expect(result).toBeDefined();

    if (result !== undefined) {
      expect(nodeIds(result)).toEqual(["d", "a", "c"]);
    }
  });

  it("freezes the result and its collections", () => {
    const result = shortestPath(graph, "a", "d");

    expect(result).toBeDefined();

    if (result !== undefined) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.nodes)).toBe(true);
      expect(Object.isFrozen(result.edges)).toBe(true);
    }
  });

  it("rejects missing endpoints", () => {
    expect(() => shortestPath(graph, "missing", "a")).toThrow(GraphError);
    expect(() => shortestPath(graph, "a", "missing")).toThrow(
      expect.objectContaining({
        code: "UNKNOWN_NODE",
        id: "missing",
      }),
    );
  });
});
