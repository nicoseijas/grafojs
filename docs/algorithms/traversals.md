# BFS and DFS traversals

This document defines the observable v0 contract of `bfs` and `dfs`.

## Inputs

Both functions receive a valid `Graph<N, E>` and an existing start node id. An
unknown id throws `GraphError` with code `UNKNOWN_NODE`. A non-string id
received from untyped JavaScript produces `INVALID_ID`.

Traversals follow outgoing edges only.

## Result

The result is a runtime-frozen `readonly` array of reachable `GraphNode<N>`
values, including the start node:

- `bfs` returns breadth-first level order;
- `dfs` returns iterative depth-first pre-order.

Ties follow edge insertion order from ADR-0002. Parallel edges do not repeat a
neighbor. Self-loops and cycles do not repeat nodes.

Only nodes reachable from the start are included. A disconnected graph requires
another traversal to visit another component. An empty graph has no valid start
id and therefore produces `UNKNOWN_NODE`.

## Complexity

For the reachable subgraph:

- time: `O(V + E)`;
- auxiliary space: `O(V)`.

Both implementations are iterative and do not depend on the JavaScript call
stack limit.
