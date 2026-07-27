# ADR-0002: initial internal representation

- Status: accepted
- Date: 2026-07-26

## Context

The core needs efficient id lookup and adjacency queries, but no measurements
yet justify a specialized persistent data structure.

## Decision

Each graph keeps private node and edge maps, plus incoming and outgoing edge-id
indexes per node. State is registered in a module-private `WeakMap`; graph
objects do not expose state through string or symbol properties.

v0 transformations rebuild state and indexes from the resulting collections. No
mutable map or set is shared between graph versions. Payload references are
preserved according to ADR-0001.

Maps preserve insertion order:

- nodes and edges are enumerated in insertion order;
- adjacency follows edge insertion order;
- a neighbor connected by several edges appears once, at the position of the
  first connecting edge;
- removing and re-adding an id places it at the end.

## Consequences

- Construction and transformations cost `O(V + E)`.
- Expected id lookup cost is `O(1)`.
- Expected adjacency enumeration cost is `O(degree)`.
- Previous graph versions remain isolated without relying on internal
  discipline.
- Structural sharing remains deferred until representative benchmarks show
  rebuilding to be a bottleneck.
