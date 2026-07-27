# ADR-0001: public core model

- Status: accepted
- Date: 2026-07-26

## Context

The core must separate structural fields (`id`, `from`, and `to`) from arbitrary
consumer data. The first consumer uses flat `SceneNode` and `SceneEdge` records,
while a generic API must also avoid field collisions and protect topology
invariants.

## Decision

`Graph<N, E>` represents nodes and edges with a nested payload:

```ts
interface GraphNode<N> {
  readonly id: string;
  readonly data: N;
}

interface GraphEdge<E> {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly data: E;
}
```

`Graph` is nominal and opaque. Pure functions are the canonical API; neither a
constructor nor the internal representation is exported.

The core copies and shallow-freezes structural records. It keeps the original
payload reference and never mutates, clones, or freezes it.

Consumers with flat records adapt them at the boundary. An adapter utility may
be introduced after more than one real use case exists, without changing the
core model.

Domain failures use `GraphError` with stable codes.

## Consequences

- Topology and payloads have unambiguous responsibilities.
- External mutation of an input record cannot change stored ids or endpoints.
- The first consumer needs a small mapping step when constructing a graph.
- A future fluent facade can be added without changing canonical semantics.
