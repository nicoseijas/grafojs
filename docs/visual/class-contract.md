# The class contract

The renderer draws an SVG tree, and it puts classes and data attributes on that
tree. A host that gives its own styles with `injectStyles: false` writes
selectors against those names. So the names are a contract.

This document gives the names that the contract holds. A change to a name on
this page is a minor version in `0.x`, and `CHANGELOG.md` records it. A test in
`svg-renderer.test.ts` holds each name.

Every other detail of the tree is internal, and it can change in a patch
version. The list of internal details is at the end of this page.

## Identity

| Attribute      | Element                       |
| -------------- | ----------------------------- |
| `data-node-id` | the group that draws one node |
| `data-edge-id` | the group that draws one edge |

The value is the id from the scene. A host can find the element of a node with
`svg.querySelector('[data-node-id="store"]')`.

## Structure

| Class                      | Meaning                                           |
| -------------------------- | ------------------------------------------------- |
| `gjs-root`                 | the group that holds the whole visual tree        |
| `gjs-node`                 | the group of one node                             |
| `gjs-edge`                 | the group of one edge                             |
| `gjs-edge--relation`       | the default edge kind                             |
| `gjs-edge--implementation` | the UML realization kind                          |
| `gjs-edge--invisible`      | an edge that keeps the topology and shows no line |
| `gjs-node-shape`           | the shape element inside a node                   |
| `gjs-node-shape--rect`     | the shape variant, one class for each shape name  |
| `gjs-tag`                  | the text of the `tag` field                       |
| `gjs-role`                 | the text of the `role` field                      |

The renderer writes one `gjs-node-shape--*` class for each shape of the scene
model: `rect`, `pill`, `ellipse`, `diamond`, and `hexagon`.

The classes of the host from the `classes` field go on the same group as
`gjs-node` and `gjs-edge`. The methods `setNodeClass` and `setEdgeClass` add a
class to that group and remove a class from it. The host cannot use a class that
starts with `gjs-`, because the renderer owns that prefix.

## State

| Class               | The renderer adds it when                        |
| ------------------- | ------------------------------------------------ |
| `gjs-hidden`        | `setVisibility` hides the node or the edge       |
| `gjs-hot`           | `setEffects` marks the target as hot             |
| `gjs-stress`        | `setEffects` marks the target as stress          |
| `gjs-muted`         | `setEffects` marks the target as muted           |
| `gjs-roles-visible` | `setRolesVisible(true)`, on the `gjs-root` group |

## Animation

| Class               | Element                                |
| ------------------- | -------------------------------------- |
| `gjs-pulse`         | the dot of an active pulse             |
| `gjs-pulse--return` | the dot of a pulse with `kind: return` |
| `gjs-pulse--error`  | the dot of a pulse with `kind: error`  |

The dot carries `aria-hidden="true"`, because it is decoration.

## Custom properties

The default styles read these properties from `gjs-root`:

| Property          | Use                                       |
| ----------------- | ----------------------------------------- |
| `--gjs-surface`   | the fill of a node and of a hollow marker |
| `--gjs-ink`       | the color of a label                      |
| `--gjs-muted`     | the color of a tag and of an edge label   |
| `--gjs-line`      | the color of a line and of a border       |
| `--gjs-accent`    | the hot state and the default pulse       |
| `--gjs-interface` | the realization kind and the return pulse |
| `--gjs-danger`    | the stress state and the error pulse      |

The default styles set a value for each property on the `gjs-root` group. A host
that keeps the default styles must set another value on the same group:

```css
.gjs-root {
  --gjs-surface: #ffffff;
  --gjs-ink: #10131a;
}
```

A value on the `svg` element does not win, because the value on `gjs-root` is
nearer to the element that reads it.

## What the contract does not hold

These details can change in a patch version. Do not write a selector against
them, and do not read them from JavaScript:

- the layer groups `gjs-nodes`, `gjs-edges`, and `gjs-effects`;
- the shape of the tree: which element holds which element, and the order of the
  children of a group;
- the element names and the attributes that give the geometry, such as `d`,
  `cx`, and `rx`;
- the id of a marker and the value of `data-grafo-renderer`;
- each rule inside `DEFAULT_VISUAL_CSS`.

The renderer owns the children of the SVG element. A host that writes into that
tree loses the change at the next `render` call, because the renderer builds a
new tree for each scene.

To put a node in front of another node, give the nodes to the scene in that
order. The order of the `nodes` array and of the `edges` array gives the paint
order, and the renderer keeps it at each render. The [scene guide](./scenes.md)
gives more information.

To put host content above the graph, put an HTML layer above the SVG. The
composition section of the [scene guide](./scenes.md) shows the pattern.
