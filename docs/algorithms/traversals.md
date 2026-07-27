# BFS and DFS traversals

This document defines the observable v0 contract of `bfs` and `dfs`.

## Inputs

Both functions receive a valid `Graph<N, E>` and an existing start node id. An
unknown id throws `GraphError` with code `UNKNOWN_NODE`. A non-string id from
untyped JavaScript produces `INVALID_ID`.

Each traversal follows outgoing edges only.

## Result

The result is a runtime-frozen `readonly` array of reachable `GraphNode<N>`
values. The array also contains the start node:

- `bfs` returns breadth-first level order;
- `dfs` returns iterative depth-first pre-order.

A tie follows edge insertion order from ADR-0002. Parallel edges do not repeat a
neighbor. Self-loops and cycles do not repeat nodes.

The array contains only the nodes reachable from the start node. A disconnected
graph needs another traversal to visit another component. The empty graph has no
valid start id. So the empty graph produces `UNKNOWN_NODE`.

## Complexity

For the reachable subgraph:

- time: `O(V + E)` for both;
- auxiliary space: `O(V)` for `bfs`, `O(V + E)` for `dfs`.

`dfs` marks a node as visited when the node leaves the stack. `dfs` does not
mark the node when the node enters the stack. A mark on entry lets a shallow
branch claim a node that a deeper branch, still open, must reach first. So `dfs`
can put a node on the stack one time for each incoming edge. This behavior
raises the auxiliary space of `dfs` above `O(V)`.

Both implementations are iterative. They do not depend on the JavaScript call
stack limit.
