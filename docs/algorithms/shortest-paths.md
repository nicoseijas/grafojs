# Shortest paths

This document defines the observable contract of `shortestPath` and `dijkstra`.

## Shared result

Both functions return:

```ts
interface ShortestPathResult<N, E> {
  readonly nodes: readonly GraphNode<N>[];
  readonly edges: readonly GraphEdge<E>[];
  readonly distance: number;
}
```

The object and both arrays are frozen at runtime. `nodes` includes both
endpoints. `edges` identifies the exact chosen edges, which keeps paths
unambiguous in a multigraph.

A path from a node to itself contains that node, no edges, and distance `0`.
Valid but disconnected endpoints produce `undefined`. A missing endpoint throws
`GraphError` with code `UNKNOWN_NODE`.

All paths follow outgoing edges. Equal alternatives are resolved by edge
insertion order and the order in which nodes become reachable.

## `shortestPath`

Uses breadth-first search and minimizes the number of edges. `distance` is the
number of selected edges.

Complexity over the reachable subgraph:

- time: `O(V + E)`;
- auxiliary space: `O(V)`.

## `dijkstra`

Accepts a pure function `(edge) => number`. The function is evaluated exactly
once for every edge before the search, including edges in disconnected
components. This makes invalid weights deterministic rather than dependent on
which component is reachable.

Every weight must be finite and non-negative. Negative values, `NaN`, and
infinities throw `GraphError` with code `INVALID_WEIGHT`. A finite accumulated
distance that overflows JavaScript's finite number range throws
`DISTANCE_OVERFLOW`. Exceptions thrown by the weight function itself propagate
unchanged.

Equal-distance alternatives keep the first path discovered by deterministic
queue and edge insertion order. The implementation uses a stable binary min-heap
and does not require a runtime dependency.

Complexity:

- time: `O(E log E)`;
- auxiliary space: `O(V + E)`.
