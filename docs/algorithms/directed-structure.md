# Directed cycles and topological order

This document defines the observable contract of `hasCycle` and
`topologicalSort`.

## `hasCycle`

`hasCycle` returns `true` when the graph contains at least one directed cycle.
In every other case, `hasCycle` returns `false`. A self-loop is a cycle.
Parallel edges between two nodes do not form a cycle by themselves.

The empty graph is acyclic.

## `topologicalSort`

`topologicalSort` returns a runtime-frozen `readonly` array. The array contains
every node in a valid topological order. `topologicalSort` returns `undefined`
when the graph contains a cycle. A cycle is valid graph data, not a validation
error.

The implementation uses Kahn's algorithm. Three rules make sure that the result
is always the same:

1. the algorithm queues the initial zero-in-degree nodes in insertion order;
2. the algorithm appends a node that reaches zero in-degree to the queue;
3. the algorithm processes the outgoing edges in insertion order.

So an initially available node can appear before an earlier node. The earlier
node becomes available only while the algorithm runs.

The result for a disconnected graph includes every node. The empty graph returns
`[]`.

## Complexity

Both operations need `O(V + E)` time and `O(V)` auxiliary space. `hasCycle`
reuses `topologicalSort` so the cycle criterion has a single implementation.
