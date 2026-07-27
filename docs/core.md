# Headless graph core

This document defines the observable v0 contract of the `grafojs` entry point.
The core holds a directed multigraph. It has no dependency on a browser and no
dependency on the visual model.

The core is immutable. Each function that changes a graph returns a new graph,
and the initial graph keeps its value.

## The model

A node has an id and a payload. An edge has an id, two endpoints, and a payload:

```ts
import { addEdge, addNode, createGraph } from "grafojs";

const empty = createGraph<{ label: string }, { cost: number }>();
const withNodes = addNode(addNode(empty, { id: "a", data: { label: "A" } }), {
  id: "b",
  data: { label: "B" },
});
const graph = addEdge(withNodes, {
  id: "a-b",
  from: "a",
  to: "b",
  data: { cost: 2 },
});

graph.nodeCount; // 2
graph.edgeCount; // 1
```

The type parameters are `Graph<N, E>`. `N` is the type of a node payload, and
`E` is the type of an edge payload. Both default to `unknown`.

`Graph` is opaque. It shows `nodeCount` and `edgeCount`, and it shows no other
property. Only the exported functions read and change a graph. A value from
another source throws `TypeError`. ADR-0001 gives the reason for this model, and
ADR-0002 gives the internal representation.

`createGraph` also accepts a complete `GraphInput`:

```ts
const graph = createGraph({
  nodes: [
    { id: "a", data: { label: "A" } },
    { id: "b", data: { label: "B" } },
  ],
  edges: [{ id: "a-b", from: "a", to: "b", data: { cost: 2 } }],
});
```

## Payloads

The core copies each structural record and freezes the copy. A change to the
input record after the call does not change the graph.

The core keeps the reference to `data`. It does not clone the payload, and it
does not freeze the payload. A payload that the consumer changes is visible
through the graph. Use an immutable payload when this behavior is a risk.

## Order

A map keeps insertion order, so the results follow insertion order:

- `getNodes` and `getEdges` return the nodes and the edges in insertion order;
- `outgoingEdges` and `incomingEdges` follow edge insertion order;
- `successors` and `predecessors` return each neighbor one time, at the position
  of the first edge that connects the two nodes;
- `removeNode` and a new `addNode` with the same id put the node at the end.

Each function that returns an array returns a frozen `readonly` array. The array
is a new array, so the caller can hold it without a risk to the graph.

## Read the graph

| Function               | Result                                          |
| ---------------------- | ----------------------------------------------- |
| `getNode(graph, id)`   | the node, or `undefined` for a missing id       |
| `getEdge(graph, id)`   | the edge, or `undefined` for a missing id       |
| `hasNode(graph, id)`   | `true` when the node exists                     |
| `hasEdge(graph, id)`   | `true` when the edge exists                     |
| `getNodes(graph)`      | every node, in insertion order                  |
| `getEdges(graph)`      | every edge, in insertion order                  |
| `outgoingEdges(g, id)` | the edges that leave the node                   |
| `incomingEdges(g, id)` | the edges that arrive at the node               |
| `successors(g, id)`    | the target node of each outgoing edge, one time |
| `predecessors(g, id)`  | the source node of each incoming edge, one time |
| `outDegree(graph, id)` | the count of outgoing edges                     |
| `inDegree(graph, id)`  | the count of incoming edges                     |

A self-loop is an edge that has one node as the source and as the target. The
node is its own successor and its own predecessor. The self-loop adds one to the
out-degree and one to the in-degree.

Parallel edges are two edges that have the same endpoints and different ids. The
multigraph accepts them. Both edges appear in `outgoingEdges`, and the shared
neighbor appears one time in `successors`.

## Change the graph

| Function                | Result                                     |
| ----------------------- | ------------------------------------------ |
| `addNode(graph, node)`  | a new graph that has the node              |
| `addEdge(graph, edge)`  | a new graph that has the edge              |
| `removeNode(graph, id)` | a new graph without the node and its edges |
| `removeEdge(graph, id)` | a new graph without the edge               |

`removeNode` also removes every edge that starts at the node and every edge that
arrives at the node.

A remove function that gets a missing id returns the initial graph. The result
is the same value, so `removeNode(graph, "missing") === graph` is `true`. The id
must still be a string.

## Errors

A domain failure throws `GraphError`. The error has a stable `code`, and it also
has the `operation`, the `entity`, and the `id` of the failure. So a consumer
can branch on the code and does not read the message:

```ts
import { GraphError } from "grafojs";

try {
  addNode(graph, { id: "a", data: { label: "again" } });
} catch (error) {
  if (error instanceof GraphError && error.code === "DUPLICATE_NODE") {
    // the graph already has this node
  }
}
```

These codes come from the core:

| Code               | Cause                                         |
| ------------------ | --------------------------------------------- |
| `INVALID_ID`       | an id that is not a string                    |
| `INVALID_INPUT`    | a record or a collection with the wrong shape |
| `DUPLICATE_NODE`   | a node id that the graph already has          |
| `DUPLICATE_EDGE`   | an edge id that the graph already has         |
| `MISSING_ENDPOINT` | an edge that names a node that does not exist |
| `UNKNOWN_NODE`     | an operation on a node that does not exist    |

The algorithms add `INVALID_WEIGHT` and `DISTANCE_OVERFLOW`. The
[algorithm contracts](./algorithms) give the conditions for these two codes.

TypeScript stops most of these failures at compile time. The checks protect a
consumer that calls the API from JavaScript.

`getNode` and `getEdge` return `undefined` for a missing id. They do not throw.
The functions that need a node, such as `successors` and `outDegree`, throw
`UNKNOWN_NODE`.

## Cost

For a graph that has `V` nodes and `E` edges:

- `createGraph`: `O(V + E)`;
- `getNode`, `getEdge`, `hasNode`, `hasEdge`, `outDegree`, `inDegree`: `O(1)`;
- `outgoingEdges`, `incomingEdges`, `successors`, `predecessors`: `O(degree)`;
- `getNodes`: `O(V)`, and `getEdges`: `O(E)`;
- `addNode`, `addEdge`, `removeNode`, `removeEdge`: `O(V + E)`.

A change rebuilds the state, because v0 has no structural sharing. So a loop
that adds `V` nodes one by one costs `O(V²)`. Give every node and every edge to
`createGraph` when you build a large graph.

## Types

The entry point also exports the types of the model: `Graph`, `GraphNode`,
`GraphEdge`, `GraphInput`, `NodeId`, `EdgeId`, `GraphError`, `GraphErrorCode`,
`GraphErrorDetails`, and `GraphEntity`.
