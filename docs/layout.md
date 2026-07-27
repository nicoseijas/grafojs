# Layout helpers

`grafojs/layout` provides small, deterministic, dependency-free helpers for
arranging nodes before they are rendered. It is optional: applications can
continue to supply manual coordinates whenever narrative control matters.

Each helper accepts records with an `id`, `width`, and `height`, then returns
immutable positions and bounds. `applyLayout` combines those positions with the
original records without mutating them.

## Rows and columns

```ts
import { applyLayout, layoutRow } from "grafojs/layout";
import type { VisualNode } from "grafojs/visual";

const source: readonly Omit<VisualNode, "x" | "y">[] = [
  { id: "client", width: 150, height: 64, label: "Client" },
  { id: "api", width: 150, height: 64, label: "API" },
  { id: "worker", width: 150, height: 64, label: "Worker" },
];

const nodes = applyLayout(
  source,
  layoutRow(source, { x: 40, y: 120, gap: 72 }),
);
```

`layoutRow` and `layoutColumn` preserve input order. Both accept `x`, `y`,
`gap`, and a cross-axis `align` value of `start`, `center` (the default), or
`end`.

## Trees

```ts
import { layoutTree } from "grafojs/layout";

const layout = layoutTree(
  nodes,
  [
    { from: "gateway", to: "card" },
    { from: "gateway", to: "bank" },
  ],
  {
    root: "gateway",
    direction: "down",
    levelGap: 64,
    siblingGap: 48,
  },
);
```

Tree links point from parent to child, and their array order controls sibling
order. The helper rejects cycles, duplicate links, multiple parents, unknown
nodes, and disconnected trees. `direction` is `down` by default and may also be
`right`.

## Radial arrangements

```ts
import { layoutRadial } from "grafojs/layout";

const layout = layoutRadial(nodes, {
  centerX: 360,
  centerY: 220,
  radius: 150,
  startAngleDegrees: -90,
});
```

Nodes are placed around the requested circle in input order. The default sweep
is 360 degrees; a non-360-degree sweep includes both endpoints of the arc.
