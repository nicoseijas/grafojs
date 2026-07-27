import { describe, expect, it } from "vitest";

import {
  GraphError,
  addEdge,
  addNode,
  createGraph,
  getEdge,
  getEdges,
  getNode,
  getNodes,
  hasEdge,
  hasNode,
  inDegree,
  incomingEdges,
  outDegree,
  outgoingEdges,
  predecessors,
  removeEdge,
  removeNode,
  successors,
} from "../index.js";
import type { GraphEdge, GraphInput, GraphNode } from "../index.js";

interface NodeData {
  readonly label: string;
}

interface EdgeData {
  readonly kind: string;
}

const node = (id: string): GraphNode<NodeData> => ({
  id,
  data: { label: id.toUpperCase() },
});

const edge = (id: string, from: string, to: string): GraphEdge<EdgeData> => ({
  id,
  from,
  to,
  data: { kind: "test" },
});

const captureGraphError = (operation: () => unknown): GraphError => {
  try {
    operation();
  } catch (error: unknown) {
    if (error instanceof GraphError) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected operation to throw GraphError.");
};

describe("createGraph", () => {
  it("creates an empty graph", () => {
    const graph = createGraph();

    expect(graph.nodeCount).toBe(0);
    expect(graph.edgeCount).toBe(0);
    expect(getNodes(graph)).toEqual([]);
    expect(getEdges(graph)).toEqual([]);
  });

  it("copies and freezes structure while preserving payload references", () => {
    const data = { label: "A" };
    const input = { id: "a", data };
    const graph = createGraph({ nodes: [input] });

    input.id = "changed-outside";

    const stored = getNode(graph, "a");
    expect(stored).toEqual({ id: "a", data: { label: "A" } });
    expect(stored?.data).toBe(data);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(hasNode(graph, "changed-outside")).toBe(false);
  });

  it("does not expose internal state through own symbols", () => {
    const graph = createGraph({ nodes: [node("a")] });

    expect(Object.getOwnPropertySymbols(graph)).toEqual([]);
  });

  it("rejects duplicate node and edge ids", () => {
    const nodeError = captureGraphError(() =>
      createGraph({ nodes: [node("a"), node("a")] }),
    );
    expect(nodeError).toMatchObject({
      code: "DUPLICATE_NODE",
      id: "a",
    });

    const edgeError = captureGraphError(() =>
      createGraph({
        nodes: [node("a")],
        edges: [edge("loop", "a", "a"), edge("loop", "a", "a")],
      }),
    );
    expect(edgeError).toMatchObject({
      code: "DUPLICATE_EDGE",
      id: "loop",
    });
  });

  it("rejects edges whose endpoints do not exist", () => {
    const error = captureGraphError(() =>
      createGraph({
        nodes: [node("a")],
        edges: [edge("a-b", "a", "b")],
      }),
    );
    expect(error).toMatchObject({
      code: "MISSING_ENDPOINT",
      id: "a-b",
    });
    expect(error.message).toContain('to node "b"');

    const missingFrom = captureGraphError(() =>
      createGraph({
        nodes: [node("b")],
        edges: [edge("a-b", "a", "b")],
      }),
    );
    expect(missingFrom.code).toBe("MISSING_ENDPOINT");
    expect(missingFrom.message).toContain('from node "a"');
  });

  it("rejects non-string ids received from JavaScript", () => {
    const invalidNode = {
      id: 1,
      data: { label: "invalid" },
    } as unknown as GraphNode<NodeData>;

    const error = captureGraphError(() =>
      createGraph({ nodes: [invalidNode] }),
    );
    expect(error).toMatchObject({
      code: "INVALID_ID",
      entity: "node",
    });
  });

  it.each([
    ["null input", null],
    ["non-array nodes", { nodes: 42 }],
    ["null node", { nodes: [null] }],
    ["node without data", { nodes: [{ id: "a" }] }],
    ["non-array edges", { edges: "invalid" }],
    ["null edge", { edges: [null] }],
    [
      "edge without data",
      {
        nodes: [
          { id: "a", data: undefined },
          { id: "b", data: undefined },
        ],
        edges: [{ id: "a-b", from: "a", to: "b" }],
      },
    ],
  ])("rejects malformed JavaScript structures: %s", (_label, input) => {
    const error = captureGraphError(() =>
      createGraph(input as unknown as GraphInput<unknown, unknown>),
    );

    expect(error.code).toBe("INVALID_INPUT");
  });
});

describe("immutable transformations", () => {
  it("adds nodes and edges without changing earlier versions", () => {
    const empty = createGraph<NodeData, EdgeData>();
    const oneNode = addNode(empty, node("a"));
    const twoNodes = addNode(oneNode, node("b"));
    const connected = addEdge(twoNodes, edge("a-b", "a", "b"));

    expect(empty.nodeCount).toBe(0);
    expect(oneNode.nodeCount).toBe(1);
    expect(oneNode.edgeCount).toBe(0);
    expect(twoNodes.nodeCount).toBe(2);
    expect(twoNodes.edgeCount).toBe(0);
    expect(connected.nodeCount).toBe(2);
    expect(connected.edgeCount).toBe(1);
    expect(getEdge(connected, "a-b")).toEqual(edge("a-b", "a", "b"));
  });

  it("rejects invalid additions with actionable errors", () => {
    const graph = createGraph<NodeData, EdgeData>({
      nodes: [node("a")],
    });

    expect(() => addNode(graph, node("a"))).toThrow(GraphError);

    const error = captureGraphError(() =>
      addEdge(graph, edge("a-b", "a", "b")),
    );
    expect(error.code).toBe("MISSING_ENDPOINT");
    expect(error.message).toContain('edge "a-b"');

    const missingFrom = captureGraphError(() =>
      addEdge(graph, edge("b-a", "b", "a")),
    );
    expect(missingFrom.code).toBe("MISSING_ENDPOINT");
    expect(missingFrom.message).toContain('from node "b"');

    const withLoop = addEdge(graph, edge("loop", "a", "a"));
    const duplicate = captureGraphError(() =>
      addEdge(withLoop, edge("loop", "a", "a")),
    );
    expect(duplicate.code).toBe("DUPLICATE_EDGE");
  });

  it("rejects malformed additions received from JavaScript", () => {
    const graph = createGraph<NodeData, EdgeData>();
    const invalidNode = null as unknown as GraphNode<NodeData>;
    const invalidEdge = {
      id: "a-b",
      from: "a",
      to: "b",
    } as unknown as GraphEdge<EdgeData>;

    expect(captureGraphError(() => addNode(graph, invalidNode)).code).toBe(
      "INVALID_INPUT",
    );
    expect(captureGraphError(() => addEdge(graph, invalidEdge)).code).toBe(
      "INVALID_INPUT",
    );
  });

  it("removes incident edges with a node", () => {
    const original = createGraph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        edge("a-b", "a", "b"),
        edge("b-c", "b", "c"),
        edge("c-a", "c", "a"),
      ],
    });

    const result = removeNode(original, "b");

    expect(getNodes(result).map(({ id }) => id)).toEqual(["a", "c"]);
    expect(getEdges(result).map(({ id }) => id)).toEqual(["c-a"]);
    expect(original.nodeCount).toBe(3);
    expect(original.edgeCount).toBe(3);
  });

  it("removes one edge and treats absent ids as no-ops", () => {
    const original = createGraph({
      nodes: [node("a"), node("b")],
      edges: [edge("first", "a", "b"), edge("second", "a", "b")],
    });

    const result = removeEdge(original, "first");

    expect(getEdges(result).map(({ id }) => id)).toEqual(["second"]);
    expect(original.edgeCount).toBe(2);
    expect(removeNode(result, "missing")).toBe(result);
    expect(removeEdge(result, "missing")).toBe(result);
  });
});

describe("queries", () => {
  const graph = createGraph({
    nodes: [node("a"), node("b")],
    edges: [
      edge("first", "a", "b"),
      edge("second", "a", "b"),
      edge("loop", "b", "b"),
      edge("reverse", "b", "a"),
    ],
  });

  it("preserves edge multiplicity and insertion order", () => {
    expect(outgoingEdges(graph, "a").map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
    expect(incomingEdges(graph, "b").map(({ id }) => id)).toEqual([
      "first",
      "second",
      "loop",
    ]);
  });

  it("returns each neighboring node once", () => {
    expect(successors(graph, "a").map(({ id }) => id)).toEqual(["b"]);
    expect(successors(graph, "b").map(({ id }) => id)).toEqual(["b", "a"]);
    expect(predecessors(graph, "b").map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("counts parallel edges and self-loops", () => {
    expect(outDegree(graph, "a")).toBe(2);
    expect(inDegree(graph, "b")).toBe(3);
    expect(outDegree(graph, "b")).toBe(2);
  });

  it("returns expected negative query results", () => {
    expect(getNode(graph, "missing")).toBeUndefined();
    expect(getEdge(graph, "missing")).toBeUndefined();
    expect(hasNode(graph, "missing")).toBe(false);
    expect(hasEdge(graph, "missing")).toBe(false);
  });

  it("rejects adjacency queries for unknown nodes", () => {
    const error = captureGraphError(() => successors(graph, "missing"));
    expect(error).toMatchObject({
      code: "UNKNOWN_NODE",
      id: "missing",
    });

    expect(() => incomingEdges(graph, "missing")).toThrow(GraphError);
  });

  it("does not expose mutable collection arrays", () => {
    const nodes = getNodes(graph);
    const edges = outgoingEdges(graph, "a");

    expect(Object.isFrozen(nodes)).toBe(true);
    expect(Object.isFrozen(edges)).toBe(true);
    expect(() => (nodes as GraphNode<NodeData>[]).push(node("c"))).toThrow();
    expect(() =>
      (edges as GraphEdge<EdgeData>[]).push(edge("extra", "a", "b")),
    ).toThrow();
  });
});
