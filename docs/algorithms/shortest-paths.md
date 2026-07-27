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

grafojs freezes the object and both arrays at runtime. `nodes` includes both
endpoints. `edges` shows the exact chosen edges. This keeps each path
unambiguous in a multigraph.

A path from a node to itself contains that node, no edges, and distance `0`.
Valid but disconnected endpoints produce `undefined`. A missing endpoint throws
`GraphError` with code `UNKNOWN_NODE`.

Every path follows outgoing edges. grafojs resolves an equal alternative with
edge insertion order and with the order in which the nodes become reachable.

## `shortestPath`

`shortestPath` uses breadth-first search and minimizes the number of edges.
`distance` is the number of selected edges.

Complexity over the reachable subgraph:

- time: `O(V + E)`;
- auxiliary space: `O(V)`.

## `dijkstra`

`dijkstra` accepts a pure function `(edge) => number`. `dijkstra` calls the
function exactly one time for every edge before the search. This includes the
edges in disconnected components. So the behavior for an invalid weight is
always the same. It does not depend on which component is reachable.

Every weight must be finite and non-negative. Negative values, `NaN`, and
infinities throw `GraphError` with code `INVALID_WEIGHT`. A finite accumulated
distance that overflows the finite number range of JavaScript throws
`DISTANCE_OVERFLOW`. The weight function itself can throw an exception. grafojs
does not catch this error, and grafojs does not change it.

For an equal-distance alternative, `dijkstra` keeps the first path that the
search finds. The queue order and the edge insertion order control this choice,
and the result is always the same. The implementation uses a stable binary
min-heap. The implementation does not need a runtime dependency.

Complexity:

- time: `O(E log E)`;
- auxiliary space: `O(V + E)`.
