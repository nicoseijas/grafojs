import { describe, expect, it } from "vitest";

import { createGraph, stronglyConnectedComponents } from "../index.js";
import type { GraphComponents, GraphNode } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const ids = (components: GraphComponents<string>): readonly string[][] =>
  components.map((component) => component.map(({ id }) => id));

describe("stronglyConnectedComponents", () => {
  it("partitions a directed graph into maximal strong components", () => {
    const graph = createGraph({
      nodes: ["a", "b", "c", "d", "e", "f", "isolated"].map(node),
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-a", from: "b", to: "a", data: undefined },
        { id: "a-b-parallel", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
        { id: "c-d", from: "c", to: "d", data: undefined },
        { id: "d-c", from: "d", to: "c", data: undefined },
        { id: "d-e", from: "d", to: "e", data: undefined },
        { id: "e-loop", from: "e", to: "e", data: undefined },
        { id: "f-d", from: "f", to: "d", data: undefined },
      ],
    });

    expect(ids(stronglyConnectedComponents(graph))).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
      ["f"],
      ["isolated"],
    ]);
  });

  it("keeps one-way-connected nodes in separate components", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
      ],
    });

    expect(ids(stronglyConnectedComponents(graph))).toEqual([
      ["a"],
      ["b"],
      ["c"],
    ]);
  });

  it("recognizes one directed cycle as one component", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
        { id: "c-a", from: "c", to: "a", data: undefined },
      ],
    });

    expect(ids(stronglyConnectedComponents(graph))).toEqual([["a", "b", "c"]]);
  });

  it("returns frozen results for an empty graph and singleton components", () => {
    const empty = stronglyConnectedComponents(createGraph());
    const singleton = stronglyConnectedComponents(
      createGraph({ nodes: [node("a")] }),
    );

    expect(empty).toEqual([]);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(ids(singleton)).toEqual([["a"]]);
    expect(Object.isFrozen(singleton)).toBe(true);
    expect(Object.isFrozen(singleton[0])).toBe(true);
  });
});
