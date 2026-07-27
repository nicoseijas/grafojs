# Visual scenes

The `grafojs/visual` entry point renders small declarative scenes to SVG. It is
framework agnostic and can be called from vanilla JavaScript, Astro, React, Vue,
Svelte, or another host that supplies an `SVGSVGElement`.

## Scene semantics

Nodes use explicit coordinates and sizes. Their optional `shape` is one of
`rect` (the default rounded rectangle), `pill`, `ellipse`, `diamond`, or
`hexagon`. Edges connect to the appropriate shape border.

Edges use `routing: "curve"` by default; `bend` offsets that quadratic curve's
control point vertically and defaults to `-14`. `routing: "straight"` draws a
direct segment, while `routing: "orthogonal"` draws deterministic horizontal and
vertical elbows at the midpoint.

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

SVG does not wrap text automatically. A node label can contain line breaks;
grafojs renders each line as an SVG `tspan` with a deterministic line height.

Scene and array order are deterministic:

- edges are painted in declared order;
- nodes are painted above edges in declared order;
- pulse effects are painted above both.

An invisible edge retains its geometry for animation while its visual path is
hidden. This is useful for construction slots, rings, and other scene-specific
motion that should not imply a structural relationship.

## State updates

`setVisibility` and `setEffects` replace their respective previous state:

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

Passing an empty object clears that state. Unknown ids throw `VisualError`
instead of being ignored.

## Animation

Each pulse leg names an edge and may reverse its path:

```ts
const result = await view.pulse(
  [{ edge: "context-strategy" }, { edge: "strategy-concrete", reverse: true }],
  { kind: "call", durationMs: 500 },
);
```

The result is:

- `completed` when all legs finish;
- `cancelled` when the scene is rendered again or the view is destroyed;
- `reduced-motion` when motion is disabled by the platform or host.

The duration applies to each leg.

## Theming

Default styles are injected into the SVG and use `--gjs-*` custom properties.
Set `injectStyles: false` to provide all styles from the host. Consumer classes
are preserved on nodes and edges; the `gjs-` prefix is reserved by the library.

The renderer labels roles with `Role:` by default. Localized hosts can set
`rolePrefix`, for example `{ rolePrefix: "rol" }`.
