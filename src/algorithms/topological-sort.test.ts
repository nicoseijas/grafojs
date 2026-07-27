import { describe, expect, it } from "vitest";

import { createGraph, topologicalSort } from "../index.js";
import type { GraphNode } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const ids = (
  nodes: readonly GraphNode<string>[] | undefined,
): readonly string[] | undefined => nodes?.map(({ id }) => id);

describe("topologicalSort", () => {
  it("returns an empty frozen array for an empty graph", () => {
    const result = topologicalSort(createGraph());

    expect(result).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("sorts a DAG using the documented deterministic queue order", () => {
    const graph = createGraph({
      nodes: ["a", "b", "c", "d", "isolated"].map(node),
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "a-c", from: "a", to: "c", data: undefined },
        { id: "b-d", from: "b", to: "d", data: undefined },
        { id: "c-d", from: "c", to: "d", data: undefined },
      ],
    });

    const result = topologicalSort(graph);

    expect(ids(result)).toEqual(["a", "isolated", "b", "c", "d"]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("counts parallel incoming edges independently without creating a cycle", () => {
    const graph = createGraph({
      nodes: [node("source"), node("target")],
      edges: [
        { id: "first", from: "source", to: "target", data: undefined },
        { id: "second", from: "source", to: "target", data: undefined },
      ],
    });

    expect(ids(topologicalSort(graph))).toEqual(["source", "target"]);
  });

  it("returns undefined for a directed cycle", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-a", from: "b", to: "a", data: undefined },
      ],
    });

    expect(topologicalSort(graph)).toBeUndefined();
  });

  it("returns undefined for a self-loop", () => {
    const graph = createGraph({
      nodes: [node("a")],
      edges: [{ id: "loop", from: "a", to: "a", data: undefined }],
    });

    expect(topologicalSort(graph)).toBeUndefined();
  });
});
