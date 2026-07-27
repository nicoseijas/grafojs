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

## Fit a node to its text

A scene gives the size of each node. The two fit helpers calculate that size
from the text of the node, so an author does not guess it:

```ts
import { fitNodeHeight, fitNodeWidth } from "grafojs/layout";

const nodes = source.map((node) => ({
  ...node,
  width: Math.max(node.width, fitNodeWidth(node)),
  height: fitNodeHeight(node),
}));
```

`fitNodeHeight` gives the height that holds the label, the optional tag, and the
optional role, with the same space above the first row and below the last row.
The renderer draws a known number of rows at known distances, so this result is
exact. A node that gets a smaller height still draws every row, but the last row
comes nearer to the border, and it can go below the border.

`fitNodeWidth` gives the width of the widest row. Each character of a monospace
font has the same width, so the result is exact for such a font. A proportional
font needs a real measurement, and this helper does not make one. Treat the
result as a first guess, or give a `charWidthRatio` that matches your font. The
default ratio is `0.6`.

```ts
fitNodeWidth(node, { charWidthRatio: 0.55, rolePrefix: "rol" });
```

The `rolePrefix` value must be the same value that you give to `createSvgGraph`,
because the renderer writes that prefix before the role.

The result also follows the `shape` of the node. A diamond and a hexagon give
their text less room than a rectangle, so they need more width for the same
text.

### Why the helpers do not measure the document

A real measurement needs `getBBox` or `getComputedTextLength`. Both need an
element inside a rendered document, with the font already loaded. Three
consequences follow:

- the result of the renderer would change with the environment, and a test
  outside a browser would get zero;
- the geometry of an edge starts at the border of a node, so a size that arrives
  after the first paint needs a second pass;
- a node that grows can cover the node below it, and grafojs does not own the
  positions.

A web font brings one more problem: the first paint measures the fallback font,
and the boxes then jump when the real font arrives. So the helpers calculate,
and the scene keeps explicit numbers.

## Failure modes

Each helper validates its input. It checks that an id is not empty, that a size
is larger than zero, and that a number is finite. Each helper also validates the
geometry that it calculates.

A node size and a gap are finite, but their total can still overflow to
`Infinity`. A subtraction of two such totals then gives `NaN`. The helpers do
not return a coordinate that the visual layer must reject. They throw
`LayoutError` with the code `INVALID_GEOMETRY` instead.
