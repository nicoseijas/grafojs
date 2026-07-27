import { describe, expect, it } from "vitest";

import { GraphError, createGraph, dfs } from "../index.js";
import type { GraphNode } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const graph = createGraph({
  nodes: ["a", "b", "c", "d", "isolated"].map(node),
  edges: [
    { id: "a-b", from: "a", to: "b", data: undefined },
    { id: "a-c", from: "a", to: "c", data: undefined },
    { id: "a-b-parallel", from: "a", to: "b", data: undefined },
    { id: "b-d", from: "b", to: "d", data: undefined },
    { id: "c-d", from: "c", to: "d", data: undefined },
    { id: "b-loop", from: "b", to: "b", data: undefined },
    { id: "d-a", from: "d", to: "a", data: undefined },
  ],
});

const ids = (nodes: readonly GraphNode<string>[]): readonly string[] =>
  nodes.map(({ id }) => id);

describe("dfs", () => {
  it("visits reachable nodes in deterministic depth-first pre-order", () => {
    expect(ids(dfs(graph, "a"))).toEqual(["a", "b", "d", "c"]);
    expect(ids(dfs(graph, "c"))).toEqual(["c", "d", "a", "b"]);
  });

  it("does not repeat nodes for parallel edges, self-loops, or cycles", () => {
    expect(ids(dfs(graph, "b"))).toEqual(["b", "d", "a", "c"]);
  });

  it("descends before backtracking when a sibling is also a deeper successor", () => {
    const shared = createGraph({
      nodes: ["a", "b", "c", "d"].map(node),
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "a-c", from: "a", to: "c", data: undefined },
        { id: "a-d", from: "a", to: "d", data: undefined },
        { id: "b-d", from: "b", to: "d", data: undefined },
      ],
    });

    expect(ids(dfs(shared, "a"))).toEqual(["a", "b", "d", "c"]);
  });

  it("does not visit disconnected nodes", () => {
    expect(ids(dfs(graph, "isolated"))).toEqual(["isolated"]);
    expect(ids(dfs(graph, "a"))).not.toContain("isolated");
  });

  it("returns an array frozen in runtime", () => {
    const result = dfs(graph, "a");

    expect(Object.isFrozen(result)).toBe(true);
    expect(() => (result as GraphNode<string>[]).push(node("extra"))).toThrow();
  });

  it("rejects an unknown starting node", () => {
    expect(() => dfs(graph, "missing")).toThrow(GraphError);

    try {
      dfs(graph, "missing");
    } catch (error: unknown) {
      if (!(error instanceof GraphError)) {
        throw error;
      }

      expect(error).toMatchObject({
        code: "UNKNOWN_NODE",
        id: "missing",
        operation: "run DFS",
      });
    }
  });
});
