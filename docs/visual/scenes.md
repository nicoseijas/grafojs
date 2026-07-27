# Visual scenes

The `grafojs/visual` entry point renders a small declarative scene to SVG. It
does not need a UI framework. A host calls it from plain JavaScript, Astro,
React, Vue, Svelte, or another host that gives an `SVGSVGElement`.

## Scene semantics

A node has an explicit position and an explicit size. Its optional `shape` is
one of `rect`, `pill`, `ellipse`, `diamond`, or `hexagon`. The default shape is
`rect`, a rectangle with round corners. An edge touches the border of the
correct shape.

An edge uses `routing: "curve"` by default. The `bend` value moves the control
point of that quadratic curve up or down. Its default is `-14`. The value
`routing: "straight"` draws a direct segment. The value `routing: "orthogonal"`
draws horizontal and vertical elbows at the midpoint.

```ts
const scene = {
  nodes: [
    {
      id: "client",
      x: 40,
      y: 120,
      width: 150,
      height: 64,
      label: "Client",
      shape: "pill",
    },
    {
      id: "api",
      x: 360,
      y: 120,
      width: 170,
      height: 64,
      label: "API",
      shape: "hexagon",
    },
  ],
  edges: [
    { id: "client-api", from: "client", to: "api", routing: "orthogonal" },
  ],
};
```

SVG does not break a line of text by itself. A node label can contain a line
break. grafojs renders each line as an SVG `tspan`, and the line height is
always the same.

The scene order and the array order control what the renderer draws first:

- the renderer draws the edges in their declared order;
- the renderer draws the nodes above the edges, in their declared order;
- the renderer draws the pulse effects above both.

An invisible edge keeps its geometry for an animation, but the renderer hides
its path. Use an invisible edge for a construction slot, for a ring, or for
another motion that must not show a structural relation.

## The host element

`createSvgGraph` needs an `<svg>` element in the SVG namespace. It rejects
another element with `INVALID_INPUT`, because an HTML element such as a `<div>`
accepts the attributes and the child elements without a complaint, and then it
shows nothing.

The renderer owns the children of that element, and it writes three attributes
on it: `viewBox`, `role`, and `aria-label`. The `destroy` method removes the
content of the renderer and gives the three attributes back the value that the
host gave. An attribute that the host did not give goes away.

```ts
const view = createSvgGraph(svg, scene);
// The renderer now controls the children, the viewBox, and the label.
view.destroy();
// The element is back in the state that the host gave, without the children.
```

The renderer does not put the children of the host back, because the first
render replaces them.

## Rejected scenes

The renderer validates a scene before it draws anything. A rejected scene thus
leaves the previous render unchanged. The renderer checks the ids, the
endpoints, and the geometry. Two more cases need an explanation:

- **A self-loop.** The renderer rejects an edge whose `from` value and `to`
  value name the same node. The error code is `INVALID_GEOMETRY`. No routing can
  draw such an edge, because the start point and the end point are equal, so the
  path becomes one point. The headless core does accept a self-loop. A graph
  that goes through `grafojs/adapters` must thus drop or change a self-loop
  first.
- **Coordinates that are too far apart.** The renderer checks that each
  coordinate is a finite number. Their difference can still overflow: `1e308`
  minus `-1e308` gives `Infinity`, and a product of that value gives `NaN`. A
  browser drops a whole path that contains `NaN` in its `d` attribute, and it
  gives no error. The geometry thus throws instead.

grafojs accepts a parallel edge. But two edges between the same pair of nodes
get the same default geometry, so one edge hides the other. Give each edge a
different `bend` value to separate them.

The `setRolesVisible`, `setNodeClass`, and `setEdgeClass` methods need a real
boolean. They reject another type of value. A non-boolean value makes
`classList.toggle` flip the class. The state of the view then depends on the
number of calls, not on the value.

## State updates

The `setVisibility` method and the `setEffects` method replace their previous
state:

```ts
view.setVisibility({
  hidden: { nodes: ["future-node"], edges: ["future-edge"] },
});

view.setEffects({
  hot: { nodes: ["caller"] },
  stress: { edges: ["concrete-dependency"] },
  muted: { nodes: ["inactive-service"] },
});
```

An empty object clears that state. An unknown id throws `VisualError`. The
renderer does not ignore an unknown id.

### A render clears the state of the view

`render` builds a new tree for the new scene, so it clears every state that the
host set: the visibility, the effects, the roles flag, and each class from
`setNodeClass` and `setEdgeClass`. The host applies the state again after the
call:

```ts
view.render(nextScene);
view.setVisibility(visibility);
view.setEffects(effects);
view.setRolesVisible(rolesVisible);
view.setNodeClass("cart", "selected", true);
```

The renderer keeps no memory of the state on purpose. A scene can drop a node,
and a state that names a node of the previous scene has no correct answer: the
renderer must either forget it without a word, or throw for an id that the host
never gave again. An unknown id is a content mistake, and the library reports
it, so the host owns the state that survives a scene.

A host that renders the same scene again also clears the state. Use `render` for
a new scene, and use the state methods for a change inside one scene.

## Animation

Each pulse leg names an edge. A leg can also reverse the path of that edge:

```ts
const result = await view.pulse(
  [{ edge: "context-strategy" }, { edge: "strategy-concrete", reverse: true }],
  { kind: "call", durationMs: 500 },
);
```

The result is one of these values:

- `completed`, when all the legs finish;
- `cancelled`, when the host renders the scene again or destroys the view;
- `reduced-motion`, when the platform or the host disables motion.

The duration applies to each leg.

## Theming

The renderer puts its default styles into the SVG. The styles use `--gjs-*`
custom properties. Set `injectStyles: false` to give all the styles from the
host. The renderer keeps the classes of the host on a node and on an edge. The
library reserves the `gjs-` prefix for itself.

A host that gives all the styles writes selectors against the names of the
renderer. The [class contract](./class-contract.md) gives the names that the
library holds stable, and it gives the details that can change in a patch
version.

The `grafojs/visual` entry point also exports those default styles as the
`DEFAULT_VISUAL_CSS` string. A host that sets `injectStyles: false` can put the
string into its own stylesheet, and can then change one rule:

```ts
import { DEFAULT_VISUAL_CSS } from "grafojs/visual";
```

The string is the source of the injected styles, so it changes with the
appearance of the renderer. Treat it as a start point for a theme, and do not
treat each rule in it as a stable contract.

The renderer writes `Role:` before a role by default. A host that needs another
language sets `rolePrefix`, for example `{ rolePrefix: "rol" }`.

The renderer writes the text of a `tag` and of a `role` with the case that you
give. The default styles then make both uppercase with `text-transform`. A host
that replaces the styles decides the case itself. A host that keeps the
uppercase look must copy that `text-transform` rule.

The `kind: "implementation"` value draws the UML notation for a realization: a
dashed line, and a hollow triangle at the end. The triangle takes the color of
`--gjs-surface`, because a hollow shape shows the color of the background. So a
host with a light background must set that custom property.

For a dashed line with a **solid** arrow, keep the default edge kind and add
your own class:

```ts
{ id: "step", from: "a", to: "b", classes: ["dashed"] }
```

```css
.gjs-edge.dashed path {
  stroke-dasharray: 6 6;
}
```

## Composition with host content

A node draws a shape, a label, an optional tag, and an optional role. It draws
no icon, no image, and no content outside its own box. A scene that needs those
things composes two layers, because the host already knows every coordinate: it
wrote them.

Put an HTML layer above the SVG, and position each element from the same numbers
that the scene uses:

```ts
const node = {
  id: "writer",
  x: 470,
  y: 200,
  width: 200,
  height: 64,
  label: "",
};

// The host paints the icon, the title, and a description with plain HTML.
overlay.style.left = `${String(node.x)}px`;
overlay.style.top = `${String(node.y)}px`;
overlay.style.width = `${String(node.width)}px`;
```

grafojs still does the work that is difficult to repeat by hand: it finds the
point where each edge meets the border of a shape, it builds the curve, and it
orients each arrow.

This pattern has two costs, and you must accept both:

- the text lives outside the SVG, so an exported SVG file contains no text;
- the SVG has `role="img"` and one accessible name. If the real text is in the
  HTML layer, decide which of the two layers assistive technology must read.

Keep the scene as the source of truth for the topology and the geometry. Use the
HTML layer only for presentation.
