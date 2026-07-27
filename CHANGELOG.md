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

### Documentation

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
