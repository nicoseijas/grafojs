import { describe, expect, it } from "vitest";

import { createGraph, weaklyConnectedComponents } from "../index.js";
import type { GraphComponents, GraphNode } from "../index.js";

const node = (id: string): GraphNode<string> => ({ id, data: id });

const ids = (components: GraphComponents<string>): readonly string[][] =>
  components.map((component) => component.map(({ id }) => id));

describe("weaklyConnectedComponents", () => {
  it("groups nodes after ignoring edge direction", () => {
    const graph = createGraph({
      nodes: ["a", "b", "c", "d", "e", "f", "isolated"].map(node),
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-a", from: "b", to: "a", data: undefined },
        { id: "a-b-parallel", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
        { id: "c-d", from: "c", to: "d", data: undefined },
        { id: "d-e", from: "d", to: "e", data: undefined },
        { id: "e-loop", from: "e", to: "e", data: undefined },
        { id: "f-d", from: "f", to: "d", data: undefined },
      ],
    });

    expect(ids(weaklyConnectedComponents(graph))).toEqual([
      ["a", "b", "c", "d", "e", "f"],
      ["isolated"],
    ]);
  });

  it("connects nodes through converging directed edges", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "c-b", from: "c", to: "b", data: undefined },
      ],
    });

    expect(ids(weaklyConnectedComponents(graph))).toEqual([["a", "b", "c"]]);
  });

  it("normalizes components and members by node insertion order", () => {
    const graph = createGraph({
      nodes: ["isolated", "c", "a", "b"].map(node),
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
      ],
    });

    expect(ids(weaklyConnectedComponents(graph))).toEqual([
      ["isolated"],
      ["c", "a", "b"],
    ]);
  });

  it("returns frozen results for empty and self-loop graphs", () => {
    const empty = weaklyConnectedComponents(createGraph());
    const selfLoop = weaklyConnectedComponents(
      createGraph({
        nodes: [node("a")],
        edges: [{ id: "loop", from: "a", to: "a", data: undefined }],
      }),
    );

    expect(empty).toEqual([]);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(ids(selfLoop)).toEqual([["a"]]);
    expect(Object.isFrozen(selfLoop)).toBe(true);
    expect(Object.isFrozen(selfLoop[0])).toBe(true);
  });
});
