# Strongly and weakly connected components

This document defines the observable contract of `stronglyConnectedComponents`
and `weaklyConnectedComponents`.

## Shared result

Both functions return a runtime-frozen nested `readonly` array:

```ts
type GraphComponents<N> = readonly (readonly GraphNode<N>[])[];
```

Every graph node appears exactly once. Members of each component follow node
insertion order. Components are ordered by their earliest inserted member. The
empty graph returns `[]`.

Self-loops and parallel edges do not duplicate nodes or components.

## `stronglyConnectedComponents`

Two nodes share a strongly connected component when each is reachable from the
other by following directed edges.

The implementation uses iterative Kosaraju:

1. compute directed DFS finishing order;
2. traverse the transposed graph in reverse finishing order;
3. normalize the discovered components to public insertion order.

## `weaklyConnectedComponents`

Two nodes share a weakly connected component when they are connected after edge
direction is ignored.

The implementation builds an undirected adjacency view in edge insertion order
and traverses it iteratively. It does not create or expose an undirected
`Graph`.

## Complexity

Both algorithms require:

- time: `O(V + E)`;
- auxiliary space: `O(V + E)`.
