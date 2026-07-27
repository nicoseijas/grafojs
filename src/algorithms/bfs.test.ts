import { describe, expect, it } from "vitest";

import { GraphError, bfs, createGraph } from "../index.js";
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

describe("bfs", () => {
  it("visits reachable nodes by level and edge insertion order", () => {
    expect(ids(bfs(graph, "a"))).toEqual(["a", "b", "c", "d"]);
    expect(ids(bfs(graph, "c"))).toEqual(["c", "d", "a", "b"]);
  });

  it("does not repeat nodes for parallel edges, self-loops, or cycles", () => {
    expect(ids(bfs(graph, "b"))).toEqual(["b", "d", "a", "c"]);
  });

  it("does not visit disconnected nodes", () => {
    expect(ids(bfs(graph, "isolated"))).toEqual(["isolated"]);
    expect(ids(bfs(graph, "a"))).not.toContain("isolated");
  });

  it("returns an array frozen in runtime", () => {
    const result = bfs(graph, "a");

    expect(Object.isFrozen(result)).toBe(true);
    expect(() => (result as GraphNode<string>[]).push(node("extra"))).toThrow();
  });

  it("rejects an unknown starting node", () => {
    expect(() => bfs(graph, "missing")).toThrow(GraphError);

    try {
      bfs(graph, "missing");
    } catch (error: unknown) {
      if (!(error instanceof GraphError)) {
        throw error;
      }

      expect(error).toMatchObject({
        code: "UNKNOWN_NODE",
        id: "missing",
        operation: "run BFS",
      });
    }
  });

  it("validates ids received from JavaScript", () => {
    const invalidId = 1 as unknown as string;

    expect(() => bfs(graph, invalidId)).toThrow(GraphError);

    try {
      bfs(graph, invalidId);
    } catch (error: unknown) {
      if (!(error instanceof GraphError)) {
        throw error;
      }

      expect(error.code).toBe("INVALID_ID");
    }
  });
});
