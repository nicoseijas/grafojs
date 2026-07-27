# grafojs

A TypeScript library that builds and animates small declarative scenes of nodes
and edges. It does not need a UI framework. An immutable graph core supports it.

grafojs started as the visual layer of a private learning application about
software design patterns. The library keeps nothing of that domain: it draws
nodes and edges, and the application keeps its own content.

The project is in early development. The public API can change during `0.x`.

## Features

- A declarative visual scene. You give the position of each node.
- A renderer that draws SVG and needs no UI framework.
- The `rect`, `pill`, `ellipse`, `diamond`, and `hexagon` node shapes, with the
  `curve`, `straight`, and `orthogonal` edge routes.
- Optional row, column, tree, and radial layout helpers. Each helper gives the
  same result for the same input.
- Directed, bidirectional, implementation, and invisible animation paths.
- The hidden, active, stressed, and muted visual states.
- Animated call, return, and error pulses. The renderer respects a
  reduced-motion preference.
- An immutable directed multigraph with a typed payload on each node and edge.
- Traversals, components, cycle detection, topological order, and paths.
- No runtime dependencies.

## Which entry point do you need

The package has four entry points. They are separate on purpose:

- **`grafojs/visual`** renders a scene and animates it. This is the primary
  entry point. Most applications need only this one.
- **`grafojs`** gives the headless graph and the algorithms. It touches no DOM
  and no Node.js global, so it also runs on a server. Import it when you need
  topology, and not a picture.
- **`grafojs/layout`** calculates positions. It is optional, because you can
  always give each position yourself.
- **`grafojs/adapters`** converts the topology of a graph into a scene. Import
  it when the graph data drives the picture.

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

The application that uses grafojs keeps the timeline, the narration, the code
synchronization, and the behavior of its own domain.

The renderer injects its default styles. An application that gives all the
styles sets `injectStyles: false` and writes selectors against the
[class contract](https://github.com/nicoseijas/grafojs/blob/main/docs/visual/class-contract.md),
which gives the names that do not change in a patch version.

## Layout API

The optional `grafojs/layout` entry point calculates positions. It does not
change the model of the renderer, where you give each position:

```ts
import { applyLayout, layoutRow } from "grafojs/layout";

const layout = layoutRow(nodes, { x: 40, y: 120, gap: 72 });
const positionedNodes = applyLayout(nodes, layout);
```

It has the `layoutRow`, `layoutColumn`, `layoutTree`, and `layoutRadial`
helpers. The same entry point gives `fitNodeHeight` and `fitNodeWidth`, which
calculate the size that the text of a node needs:

```ts
import { fitNodeHeight } from "grafojs/layout";

const nodes = source.map((node) => ({ ...node, height: fitNodeHeight(node) }));
```

The
[layout guide](https://github.com/nicoseijas/grafojs/blob/main/docs/layout.md)
gives the options, the limits of a tree, and the reason why the fit helpers
calculate instead of measure.

## Graph adapter API

The `grafojs/adapters` entry point changes the topology of an immutable graph
into a visual scene. It keeps the graph ids and the endpoints:

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

Use it with the optional layout helpers when the graph data gives the positions.
The
[graph-to-scene guide](https://github.com/nicoseijas/grafojs/blob/main/docs/adapters/graph-to-scene.md)
gives more information.

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

The [core guide](https://github.com/nicoseijas/grafojs/blob/main/docs/core.md)
gives the model, the order of each result, the error codes, and the cost of each
function.

## Development

The repository toolchain needs Node.js 22.13 or a later version.

```sh
npm install
npm run check
```

The [examples](https://github.com/nicoseijas/grafojs/tree/main/examples)
directory has examples that you can run.

To see the default appearance in a browser, run this command:

```sh
npm run example:visual:browser
```

The command opens a demo at
[http://localhost:4174/examples/visual-default.html](http://localhost:4174/examples/visual-default.html).

[GUIDELINES.md](https://github.com/nicoseijas/grafojs/blob/main/GUIDELINES.md)
gives the scope. The
[architecture decisions](https://github.com/nicoseijas/grafojs/tree/main/docs/adr)
give the design history. The
[algorithm contracts](https://github.com/nicoseijas/grafojs/tree/main/docs/algorithms)
give the observable behavior of each algorithm. Read
[CONTRIBUTING.md](https://github.com/nicoseijas/grafojs/blob/main/CONTRIBUTING.md)
before you send a change. The documentation follows the
[writing standard](https://github.com/nicoseijas/grafojs/blob/main/docs/writing-standard.md).

## Versioning

The version numbers follow Semantic Versioning. During `0.x`, a minor version
can break the API, and a patch version contains only a fix.
[CHANGELOG.md](https://github.com/nicoseijas/grafojs/blob/main/CHANGELOG.md)
lists each change.

## License

MIT. See [LICENSE](https://github.com/nicoseijas/grafojs/blob/main/LICENSE).
