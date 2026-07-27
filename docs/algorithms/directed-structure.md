# Directed cycles and topological order

This document defines the observable contract of `hasCycle` and
`topologicalSort`.

## `hasCycle`

Returns `true` when the graph contains at least one directed cycle and `false`
otherwise. A self-loop is a cycle. Parallel edges between two nodes do not form
a cycle by themselves.

The empty graph is acyclic.

## `topologicalSort`

Returns a runtime-frozen `readonly` array containing every node in a valid
topological order. Returns `undefined` when the graph contains a cycle; a cycle
is valid graph data, not a validation error.

The implementation uses Kahn's algorithm. To keep results deterministic:

1. initial zero-in-degree nodes are queued in insertion order;
2. nodes that reach zero in-degree are appended to the queue;
3. outgoing edges are processed in insertion order.

An initially available node may therefore appear before an earlier node that
only becomes available during processing.

Disconnected graphs include every node. The empty graph returns `[]`.

## Complexity

Both operations require `O(V + E)` time and `O(V)` auxiliary space. `hasCycle`
reuses `topologicalSort` so the cycle criterion has a single implementation.
