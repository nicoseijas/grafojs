import { describe, expect, it } from "vitest";

import { createGraph, hasCycle } from "../index.js";

const node = (id: string) => ({ id, data: undefined });

describe("hasCycle", () => {
  it("reports empty and disconnected acyclic graphs as acyclic", () => {
    expect(hasCycle(createGraph())).toBe(false);
    expect(
      hasCycle(
        createGraph({
          nodes: [node("a"), node("b"), node("isolated")],
          edges: [{ id: "a-b", from: "a", to: "b", data: undefined }],
        }),
      ),
    ).toBe(false);
  });

  it("does not mistake parallel edges for a cycle", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b")],
      edges: [
        { id: "first", from: "a", to: "b", data: undefined },
        { id: "second", from: "a", to: "b", data: undefined },
      ],
    });

    expect(hasCycle(graph)).toBe(false);
  });

  it("detects a directed cycle", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "b-c", from: "b", to: "c", data: undefined },
        { id: "c-a", from: "c", to: "a", data: undefined },
      ],
    });

    expect(hasCycle(graph)).toBe(true);
  });

  it("detects a self-loop", () => {
    const graph = createGraph({
      nodes: [node("a")],
      edges: [{ id: "loop", from: "a", to: "a", data: undefined }],
    });

    expect(hasCycle(graph)).toBe(true);
  });

  it("detects a cycle in one disconnected component", () => {
    const graph = createGraph({
      nodes: [node("a"), node("b"), node("x"), node("y")],
      edges: [
        { id: "a-b", from: "a", to: "b", data: undefined },
        { id: "x-y", from: "x", to: "y", data: undefined },
        { id: "y-x", from: "y", to: "x", data: undefined },
      ],
    });

    expect(hasCycle(graph)).toBe(true);
  });
});
