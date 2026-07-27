# grafojs

A framework-agnostic TypeScript library for building and animating small,
declarative graph-based scenes, backed by an immutable graph core.

The project is in early development. The public API may change during `0.x`.

## Features

- Declarative visual scenes with explicit, manual-first positioning.
- SVG rendering without a UI-framework dependency.
- Rect, pill, ellipse, diamond, and hexagon node shapes with curve, straight,
  and orthogonal edge routing.
- Optional deterministic row, column, tree, and radial layout helpers.
- Directed, bidirectional, implementation, and invisible animation paths.
- Visibility, active, stressed, and muted visual states.
- Animated call, return, and error pulses with reduced-motion support.
- Immutable directed multigraphs with typed node and edge payloads.
- Traversals, components, cycle detection, topological sorting, and paths.
- No runtime dependencies.

## Visual API

```ts
import { createSvgGraph, type VisualScene } from "grafojs/visual";

const scene: VisualScene = {
  width: 720,
  height: 400,
  ariaLabel: "An event source notifying two subscribers",
  nodes: [
    {
      id: "source",
      x: 40,
      y: 150,
      width: 150,
      height: 64,
      label: "Store",
      tag: "class",
      role: "Subject",
    },
    {
      id: "email",
      x: 470,
      y: 80,
      width: 180,
      height: 64,
      label: "Email subscriber",
      tag: "class",
      role: "Observer",
    },
    {
      id: "sms",
      x: 470,
      y: 230,
      width: 180,
      height: 64,
      label: "SMS subscriber",
      tag: "class",
      role: "Observer",
    },
  ],
  edges: [
    { id: "email-notification", from: "source", to: "email", label: "notify" },
    { id: "sms-notification", from: "source", to: "sms", label: "notify" },
  ],
};

const svg = document.querySelector("svg");
if (svg) {
  const view = createSvgGraph(svg, scene);
  view.setRolesVisible(true);
  view.setEffects({ hot: { nodes: ["source"] } });
  await view.pulse(
    [{ edge: "email-notification" }, { edge: "sms-notification" }],
    { kind: "call", durationMs: 500 },
  );
}
```

The learning timeline, narration, code synchronization, and domain behavior
remain in the consuming application.

## Layout API

The optional `grafojs/layout` entry point computes positions without changing
the visual renderer's manual-first model:

```ts
import { applyLayout, layoutRow } from "grafojs/layout";

const layout = layoutRow(nodes, { x: 40, y: 120, gap: 72 });
const positionedNodes = applyLayout(nodes, layout);
```

It includes `layoutRow`, `layoutColumn`, `layoutTree`, and `layoutRadial`. See
the [layout guide](./docs/layout.md) for options and tree constraints.

## Graph adapter API

`grafojs/adapters` turns immutable graph topology into a visual scene while
preserving graph ids and endpoints:

```ts
import { graphToVisualScene } from "grafojs/adapters";

const scene = graphToVisualScene(graph, {
  width: 720,
  height: 400,
  node: (node) => ({
    x: 40,
    y: 120,
    width: 160,
    height: 72,
    label: node.data.label,
  }),
});
```

Use it with the optional layout helpers when positions derive from graph data.
See the [graph-to-scene guide](./docs/adapters/graph-to-scene.md).

## Headless graph API

```ts
import { addEdge, addNode, bfs, createGraph, shortestPath } from "grafojs";

const empty = createGraph<{ label: string }, { cost: number }>();
const withNodes = addNode(addNode(empty, { id: "a", data: { label: "A" } }), {
  id: "b",
  data: { label: "B" },
});
const graph = addEdge(withNodes, {
  id: "a-b",
  from: "a",
  to: "b",
  data: { cost: 2 },
});

bfs(graph, "a");
shortestPath(graph, "a", "b");
```

## Development

Node.js 22.13 or later is required for the repository toolchain.

```sh
npm install
npm run check
```

Runnable examples are available in [examples](./examples).

To preview the default visual package in a browser, run:

```sh
npm run example:visual:browser
```

This opens a standalone demo at
[http://localhost:4174/examples/visual-default.html](http://localhost:4174/examples/visual-default.html).

See [GUIDELINES.md](./GUIDELINES.md) for scope,
[architecture decisions](./docs/adr), and
[algorithm contracts](./docs/algorithms). Read
[CONTRIBUTING.md](./CONTRIBUTING.md) before submitting changes.

## License

MIT. See [LICENSE](./LICENSE).
