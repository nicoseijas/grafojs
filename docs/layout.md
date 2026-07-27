# Layout helpers

The `grafojs/layout` entry point gives small helpers that arrange nodes before
the renderer draws them. The helpers have no dependencies, and each helper gives
the same result for the same input. They are optional: an application can always
give manual coordinates when it needs narrative control.

Each helper accepts records that have an `id`, a `width`, and a `height`. Each
helper then returns positions and bounds that the caller cannot change. The
`applyLayout` function joins those positions with the original records, and it
does not change the records.

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

The `layoutRow` helper and the `layoutColumn` helper keep the input order. Both
accept `x`, `y`, `gap`, and a cross-axis `align` value. The `align` value is
`start`, `center`, or `end`. The default is `center`.

## Trees

```ts
import { layoutTree } from "grafojs/layout";

const tree = [
  { id: "gateway", width: 150, height: 64 },
  { id: "card", width: 150, height: 64 },
  { id: "bank", width: 150, height: 64 },
];

const layout = layoutTree(
  tree,
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

A tree link points from the parent to the child. The order of the link array
controls the order of the children. The helper rejects a cycle, a duplicate
link, a node with more than one parent, an unknown node, and a tree that is not
connected. The `direction` value is `down` by default, and it can also be
`right`.

The helper walks the tree with explicit stacks, not with recursion. The depth of
a tree is thus limited by the available heap, not by the JavaScript call stack.

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

The helper puts the nodes around the requested circle in the input order. The
default sweep is 360 degrees.

A full circle in one direction or the other (`360` or `-360`) does not include
its end point. The last node thus does not go on top of the first node. A
smaller arc includes both end points. The `sweepAngleDegrees` value must be
between `-360` and `360`. A larger sweep puts one node on top of another node.

## Failure modes

Each helper validates its input. It checks that an id is not empty, that a size
is larger than zero, and that a number is finite. Each helper also validates the
geometry that it calculates.

A node size and a gap are finite, but their total can still overflow to
`Infinity`. A subtraction of two such totals then gives `NaN`. The helpers do
not return a coordinate that the visual layer must reject. They throw
`LayoutError` with the code `INVALID_GEOMETRY` instead.
