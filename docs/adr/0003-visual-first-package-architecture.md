# ADR-0003: visual-first package architecture

- **Status:** Accepted
- **Date:** 2026-07-26

## Context

grafojs began as a headless immutable graph and algorithms package. Its first
consumer, the separate `design_patterns` project, already contains several small
SVG visualizations for software structure and runtime behavior.

Those scenes share a reusable visual grammar: positioned nodes, semantic edges,
progressive reveal, active and stressed states, pattern roles, and animated
call/return/error pulses. The reusable boundary is the graph scene and its
renderer. Educational phases, narration, quizzes, code synchronization, and
playground rules remain application concerns.

Treating rendering as permanently out of scope would leave the first consumer
duplicating the exact infrastructure this package is intended to provide.
Merging the learning player into the library would make the package too
specific.

## Decision

grafojs becomes a visual-first, framework-agnostic package with separate public
entry points:

- `grafojs` exports the existing headless graph and algorithms API.
- `grafojs/visual` exports a declarative visual scene model and SVG renderer.
- `grafojs/layout` exports optional deterministic positioning helpers.
- `grafojs/adapters` exports transformations between headless and visual models.

The visual scene model is independent from the headless `Graph<N, E>` model.
This avoids forcing visual-only elements such as containers and animation paths
into algorithmic topology, while allowing explicit adapters later.

The initial renderer:

- accepts explicit coordinates and sizes;
- uses standard DOM and SVG APIs;
- has no runtime dependency or UI-framework dependency;
- owns the children of the supplied SVG element;
- supports semantic visibility, effects, roles, and path pulses;
- validates scene invariants at its public boundary;
- honors reduced-motion preferences.

The layout helpers arrange generic records with `id`, `width`, and `height`.
They provide rows, columns, connected trees, and radial arrangements without
changing the visual renderer's manual-first contract.

The graph-to-scene adapter preserves graph ids and endpoints while allowing
consumers to map data to visual presentation. It has no browser dependency.

The renderer does not know about scenarios, frames, design patterns, learning
content, code panels, or quizzes.

## Consequences

### Positive

- `design_patterns` can replace its duplicated low-level SVG renderer.
- Other consumers can use the same visual grammar without adopting an
  educational content engine.
- Root imports remain headless and safe in Node.
- Manual scene composition stays stable across narrative phases.
- Canvas or framework adapters can evolve behind separate entry points.

### Costs

- The package now maintains both headless and browser-facing surfaces.
- DOM lifecycle, accessibility, animation cancellation, and reduced motion
  become library responsibilities.
- The visual scene and headless graph models require an adapter when a consumer
  needs both.

### Rejected alternatives

- **Keep rendering out of scope:** fails the first consumer's actual reuse
  requirement.
- **Move the entire learning player into grafojs:** couples a generic package to
  one product's pedagogy.
- **Require an automatic graph-layout engine:** conflicts with the small,
  narrative, manual-first scenes already validated by the consumer.
- **Ship a framework component first:** unnecessarily restricts Astro, vanilla
  DOM, and other consumers.
