# Strongly and weakly connected components

This document defines the observable contract of `stronglyConnectedComponents`
and `weaklyConnectedComponents`.

## Shared result

Both functions return a runtime-frozen nested `readonly` array:

```ts
type GraphComponents<N> = readonly (readonly GraphNode<N>[])[];
```

Every graph node appears exactly one time. The members of each component follow
node insertion order. grafojs sorts the components by the earliest inserted
member of each component. The empty graph returns `[]`.

Self-loops and parallel edges do not duplicate nodes or components.

## `stronglyConnectedComponents`

Two nodes share a strongly connected component when each node can reach the
other node through directed edges.

The implementation uses iterative Kosaraju:

1. compute the directed DFS finish order;
2. traverse the transposed graph in reverse finish order;
3. normalize the components that the traversal finds to public insertion order.

## `weaklyConnectedComponents`

To find a weakly connected component, grafojs ignores the direction of each
edge. Two nodes then share a component when a path connects them.

The implementation builds an undirected adjacency view in edge insertion order
and traverses it iteratively. It does not create or expose an undirected
`Graph`.

## Complexity

Both algorithms need:

- time: `O(V + E)`;
- auxiliary space: `O(V + E)`.
