# grafojs — design and development guidelines

**Status:** early implementation  
**Last updated:** 2026-07-26  
**Purpose:** define the v0 product direction, public boundaries, and acceptance
criteria.

grafojs is a framework-agnostic TypeScript library for building and animating
small, declarative graph-based scenes. It also provides a headless immutable
graph core and classic graph algorithms.

grafojs started in a project of the author: a learning application about
software design patterns. The code of that application is closed, but its pages
are public. That project is the first real consumer, and it validates the visual
grammar. But grafojs remains generic: no public type or behavior may depend on a
teaching concept, a lesson phase, a quiz, or the content model of that
application.

---

## 1. Product direction

grafojs is **visual-first**. Its primary job is to let applications describe a
small scene as nodes and edges, render it as SVG, change its visible state, and
animate meaningful activity through it.

The library is intended for:

- software architecture and runtime diagrams;
- educational visualizations;
- small interactive network diagrams;
- declarative scenes where composition matters more than automatic layout.

The headless graph core remains valuable for topology, traversal, validation,
and future layout helpers. It does not dictate the visual scene model.

### First-consumer requirements

That application needs:

- declarative nodes and edges with stable string ids;
- explicit positions and sizes;
- labels, tags, roles, and extensible CSS classes;
- directed, bidirectional, implementation, and invisible animation paths;
- curved edges with deterministic geometry;
- progressive reveal and hide behavior;
- semantic effects such as active, stressed, and muted;
- animated call, return, and error pulses;
- reduced-motion support;
- an SVG renderer with no UI-framework dependency;
- manual-first layout, with optional row, column, tree, and radial helpers.

The consumer remains responsible for scenarios, phases, narration, source-code
anchors, state panels, quizzes, timelines, and domain-specific playground
behavior.

## 2. Package architecture

```text
grafojs
├── core          immutable topology and queries
├── algorithms    traversals, paths, and components
├── visual        declarative scene model and SVG renderer
├── layout        optional deterministic positioning helpers
└── adapters      graph-to-scene transformation helpers
```

Public entry points are intentionally separate:

```ts
import { createGraph, bfs } from "grafojs";
import { createSvgGraph } from "grafojs/visual";
```

Importing the root entry point must not access the DOM. The visual entry point
may use standard browser DOM and SVG APIs, but must not depend on React, Vue,
Svelte, Astro, or another rendering framework.

## 3. Visual contract

### Scene model

- A scene is a flat collection of visual nodes and visual edges.
- Node and edge ids are stable non-empty strings.
- Node ids are unique among nodes; edge ids are unique among edges.
- Every edge references two existing nodes.
- Positions and sizes are explicit finite numbers. The renderer never measures
  the document, so its result never changes with the environment. The fit
  helpers of `grafojs/layout` calculate a size from the rows of a node, and the
  scene keeps the number.
- Array order determines paint order and is preserved.
- Scene data is declarative and may be rendered again after any change.
- The renderer never mutates scene records or consumer-owned arrays.

The initial public model is:

```ts
type VisualNodeShape = "rect" | "pill" | "ellipse" | "diamond" | "hexagon";
type VisualEdgeRouting = "curve" | "straight" | "orthogonal";

interface VisualNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly shape?: VisualNodeShape;
  readonly tag?: string;
  readonly role?: string;
  readonly classes?: readonly string[];
}

interface VisualEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly kind?: "relation" | "implementation" | "invisible";
  readonly direction?: "forward" | "both" | "none";
  readonly routing?: VisualEdgeRouting;
  readonly bend?: number;
  readonly classes?: readonly string[];
}

interface VisualScene {
  readonly width: number;
  readonly height: number;
  readonly ariaLabel?: string;
  readonly nodes: readonly VisualNode[];
  readonly edges: readonly VisualEdge[];
}
```

The default shape is `rect`, and the default routing is `curve`. The `bend`
value applies only to a curved route.

Presentation classes are extensibility hooks, not topology. They must be valid
single CSS class tokens. grafojs reserves the `gjs-` prefix for its own classes.

The `gjs-` names that a theme needs are a public contract, because
`injectStyles: false` gives all the styles to the host.
`docs/visual/class-contract.md` lists them, and a test holds each name. The
layer groups and the shape of the tree stay internal. A host that needs another
paint order gives the nodes in that order, and a host that needs more content
puts an HTML layer above the SVG.

### Renderer ownership

- `createSvgGraph(svg, scene)` needs an `<svg>` element in the SVG namespace,
  and it owns the children of that element.
- Rendering a new scene replaces the renderer-owned visual tree, and it clears
  the visibility, the effects, the roles flag, and the classes of the host. The
  host applies the state again, because a new scene can drop the id that the
  state names.
- `destroy()` cancels active animations, removes renderer-owned content, and
  restores the `viewBox`, `role`, and `aria-label` values of the host.
- Text is assigned through DOM text APIs, never through untrusted HTML.
- The renderer provides accessible labeling and marks decorative animation
  elements as hidden from assistive technology.
- Default styles use CSS custom properties and can be disabled or overridden.

### Visual state

Visibility and effects are separate:

- **hidden:** absent from the current reveal level;
- **hot:** active in the current frame;
- **stress:** under architectural or runtime pressure;
- **muted:** present but de-emphasized.

State updates replace the previous state rather than accumulating implicitly.
Unknown ids are rejected so content mistakes fail during development.

### Motion

A pulse travels across one or more edge paths. Each leg can follow or reverse
the declared path. Pulse kinds are `call`, `return`, and `error`.

- Motion is presentation only and never changes topology.
- A pulse returns a promise that settles when the complete chain finishes.
- Rendering another scene or destroying the view cancels active animation.
- Reduced-motion mode skips decorative travel and resolves immediately.
- Durations must be finite and non-negative.

## 4. Headless graph contract

The existing root API remains an immutable directed multigraph:

- `NodeId` and `EdgeId` are string aliases and are never coerced.
- Node ids and edge ids are unique in separate namespaces.
- Self-loops and parallel edges are allowed.
- Every edge is directed and references existing endpoints.
- Write operations return a new graph and preserve previous versions.
- Payloads are opaque: the library never mutates, clones, or freezes them.
- Collection order, traversal order, and tie-breaking follow insertion order.

The public model is fixed by ADR-0001:

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

Core algorithms include BFS, DFS, directed cycle detection, deterministic
topological sorting, strongly and weakly connected components, unweighted
shortest paths, and Dijkstra with finite non-negative weights.

## 5. Scope and roadmap

### Current v0 work

1. Maintain the immutable graph core and algorithms.
2. Establish the declarative visual scene contract.
3. Render visual scenes to SVG.
4. Support visibility, semantic effects, roles, and path pulses.
5. Validate the packed package from JavaScript and TypeScript consumers.
6. Integrate one real scene of the first consumer through the public package.

### Next visual capabilities

- renderer lifecycle events and explicit animation cancellation results;
- visual diffs and enter/update/exit transitions;
- Canvas or WebGL renderers only if measured scene sizes require them.

### Out of scope

- scenario players, timelines, quizzes, code panels, or narration;
- interpretation of Observer, Strategy, Builder, or other domain roles;
- a full diagram editor;
- remote persistence, collaboration, or networking;
- mandatory automatic graph layout;
- a UI-framework-specific component in the base package.

## 6. Design principles

1. **Visual-first, not visual-only.** Rendering is the primary product surface;
   the headless graph remains independently useful.
2. **Manual-first composition.** Educational scenes need narrative stability
   more often than globally optimal edge routing.
3. **Declarative input, imperative view handle.** Scene data stays serializable;
   transient effects and animation live on the renderer handle.
4. **Framework agnostic.** Standard SVG and DOM APIs are the integration
   boundary.
5. **Semantic state.** Consumers express intent (`hot`, `stress`, `return`) and
   themes determine appearance.
6. **Validate at boundaries.** Invalid geometry, duplicate ids, orphan edges,
   invalid classes, and unknown effect targets fail predictably.
7. **No runtime dependencies in v0.** Exceptions require an ADR covering size,
   maintenance, licensing, and benefit.
8. **Keep entry points explicit.** Browser-specific code stays in
   `grafojs/visual`.
9. **Accessible and motion-aware by default.**
10. **English public documentation.** Markdown, public JSDoc, examples, package
    metadata, errors, and exported names use English. Markdown documentation
    follows ASD-STE100 Simplified Technical English, as recorded in ADR-0004 and
    specified in `docs/writing-standard.md`.

## 7. Technical decisions

| Topic                | Decision                                                     |
| -------------------- | ------------------------------------------------------------ |
| Language             | TypeScript with `strict: true`                               |
| Modules              | ESM only                                                     |
| Development and CI   | Node ≥ 22.13                                                 |
| ECMAScript target    | ES2022                                                       |
| Root runtime         | No Node, DOM, or browser globals                             |
| Visual runtime       | Standard DOM, SVG, and animation-frame APIs                  |
| Rendering            | SVG first                                                    |
| Layout               | Explicit coordinates first; optional helpers later           |
| Tests                | Vitest; DOM emulation is development-only                    |
| Build                | `tsc` declarations, plus source maps with inlined sources    |
| Runtime dependencies | None in v0                                                   |
| Distribution         | Packed-package tests before publication                      |
| Entry points         | `types` and `default` conditions, so `require` also resolves |

## 8. Repository structure

```text
grafojs/
├── docs/
│   ├── adr/
│   ├── algorithms/
│   └── visual/
├── examples/
├── src/
│   ├── core/
│   ├── algorithms/
│   ├── visual/
│   └── index.ts
└── test/
```

- Modules have one recognizable responsibility.
- Unit tests live beside code.
- Only entry points declared by `package.json#exports` are public.
- Black-box package tests import compiled public entry points.

## 9. Definition of done

A change is complete when:

- [ ] public types use `readonly` and avoid `any`;
- [ ] visual input is not mutated;
- [ ] invalid public input fails with a stable library error;
- [ ] renderer-owned DOM and animation resources have a clear lifecycle;
- [ ] reduced motion and accessible labeling are preserved;
- [ ] relevant geometry, visibility, effect, and animation cases are tested;
- [ ] root imports remain safe without browser globals;
- [ ] formatting, lint, typecheck, coverage, build, and package checks pass;
- [ ] no runtime dependency is added without an ADR;
- [ ] changed public exports are tested from the compiled package;
- [ ] `src/` contains no consumer-specific concepts;
- [ ] public-facing documentation is in English and follows
      `docs/writing-standard.md`.

## 10. Open questions

These questions must not be decided accidentally.

Answered:

1. **Package name:** `grafojs`. The npm registry returned 404 for that name on
   2026-07-27, so the name is free.
2. **License:** MIT. The `LICENSE` file, the `license` field, and the README
   agree, and the packed tarball ships `LICENSE`.
3. **v0 stability policy:** Semantic Versioning, with the `0.x` exception. A
   minor version can break the API, and a patch version only fixes.
   `CHANGELOG.md` records each change.
4. **Publication:** the GitHub repository `nicoseijas/grafojs` exists, and the
   `main` branch is on it. The package metadata points at that repository.

5. **Integration shape:** the first consumer adapts its own scene records, and
   that stays the supported shape. The class names that a theme needs are a
   public contract, and `docs/visual/class-contract.md` lists them. The layer
   groups and the shape of the tree stay internal, because the order of the
   scene arrays already gives the paint order.

Still open:

6. **Theme packaging:** decide whether a standalone CSS asset is useful in
   addition to injectable defaults.
