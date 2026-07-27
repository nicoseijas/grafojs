# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

The version numbers follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), with the exception
that the specification gives to a `0.x` release: a minor version can break the
API. A patch version contains only a fix.

## [Unreleased]

### Changed

- The renderer keeps the case of a `tag` and of a `role`. The default styles
  make both uppercase with `text-transform`, so the look does not change. A host
  that replaces the styles now decides the case, which it could not do before:
  the renderer changed the case in JavaScript, and `text-transform` cannot
  restore the original case.

### Added

- `fitNodeHeight` and `fitNodeWidth` in `grafojs/layout` give the size that the
  text of a node needs. `fitNodeHeight` counts the rows, so it is exact.
  `fitNodeWidth` counts the characters of the widest row, so it is exact for a
  monospace font and a first guess for another font. Neither one measures the
  document, so both give the same result in a browser, on a server, and in a
  test.
- `docs/visual/class-contract.md` makes the class names and the data attributes
  of the renderer a public contract, with a test that holds each name. A host
  that sets `injectStyles: false` gives all the styles, so it needs names that
  do not change in a patch version. The layer groups and the shape of the tree
  stay internal.

### Fixed

- The role of a node never sits on the tag. The renderer kept the role 8 pixels
  above the border, so a node lower than 74 pixels pulled the role up onto the
  tag: a node of 58 pixels left 2 pixels between two rows of 10 and 11 pixels.
  The two rows now keep a distance of 14 pixels, and the role goes below the
  border when the node is too short for the three rows.
- The text of a node now has the same space above and below. Each row sat at a
  fixed distance from the top border, so the space below the last row was
  whatever the height left: about 16 pixels above and 6 below. Every row moves
  up by 6 pixels. A host that positions text of its own against the rows of
  grafojs must check that shift.
- A node with a role and no tag puts the role in the free row, directly below
  the label. The previous version left the row of the tag empty.
- `createSvgGraph` rejects an element that is not an `<svg>` element in the SVG
  namespace. The previous version accepted a `<div>`, which takes the attributes
  and the children without a complaint and then shows nothing.
- `destroy()` gives the `viewBox`, the `role`, and the `aria-label` of the host
  element back. The previous version left the values of the renderer on the
  element of the host.

### Documentation

- `docs/visual/scenes.md` states that `render` clears the visibility, the
  effects, the roles flag, and the classes of the host, and it gives the reason:
  a new scene can drop the id that the state names. A test holds the behavior.
- `docs/core.md` gives the contract of the headless graph: the model, the
  payload rule, the order of each result, the error codes, and the cost of each
  function.
- `docs/visual/scenes.md` describes how to compose an HTML layer above the SVG
  for an icon, a description, or another element outside the node box.
- The same guide explains that `kind: "implementation"` draws the UML notation
  for a realization, and how to get a dashed line with a solid arrow.

## [0.1.0] - 2026-07-27

The first release.

### Added

- An immutable directed multigraph with a typed payload on each node and edge.
- The `bfs`, `dfs`, `hasCycle`, `topologicalSort`,
  `stronglyConnectedComponents`, `weaklyConnectedComponents`, `shortestPath`,
  and `dijkstra` algorithms.
- The `grafojs/visual` entry point, which renders a declarative scene to SVG and
  animates a pulse along an edge.
- The `grafojs/layout` entry point, with the `layoutRow`, `layoutColumn`,
  `layoutTree`, and `layoutRadial` helpers.
- The `grafojs/adapters` entry point, which converts graph topology into a
  visual scene.
- A `require` condition on each entry point, so a CommonJS caller can load the
  package on Node.js 22.13 or a later version.

### Fixed

- `dfs` now returns a correct depth-first pre-order. It marks a node when the
  node leaves the stack. The previous version marked a node when the node
  entered the stack, which gave an order that was not a depth-first pre-order.
- `layoutTree` walks the tree with explicit stacks. The previous version used
  recursion and threw a `RangeError` at a depth of about 2600 nodes.
- The row, column, tree, and radial helpers no longer spread the node array into
  `Math.max`. The previous version threw a `RangeError` at about 125000 nodes.
- The layout helpers and the edge geometry now validate the numbers that they
  calculate. The previous version could return `Infinity` or `NaN` from finite
  input, and could write `NaN` into the `d` attribute of a path.
- `layoutRadial` treats a full circle in either direction as a full circle. It
  rejects a sweep that is wider than one circle. The previous version put
  several nodes on one point.
- The renderer rejects a self-loop edge. The previous version drew a path with
  no length.
- The `setRolesVisible`, `setNodeClass`, and `setEdgeClass` methods need a
  boolean. The previous version flipped the class for another type of value.
- The published source maps now contain their own sources. The previous maps
  pointed at TypeScript files that the package does not ship.

[unreleased]: https://github.com/nicoseijas/grafojs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nicoseijas/grafojs/releases/tag/v0.1.0
