# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

The version numbers follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), with the exception
that the specification gives to a `0.x` release: a minor version can break the
API. A patch version contains only a fix.

## [Unreleased]

No change since the last release.

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
- `fitNodeHeight` and `fitNodeWidth` in `grafojs/layout`, which give the size
  that the text of a node needs. `fitNodeHeight` counts the rows, so it is
  exact. `fitNodeWidth` counts the characters of the widest row, so it is exact
  for a monospace font and a first guess for another font. Neither one measures
  the document, so both give the same result in a browser, on a server, and in a
  test.
- The `grafojs/adapters` entry point, which converts graph topology into a
  visual scene.
- A `require` condition on each entry point, so a CommonJS caller can load the
  package on Node.js 22.13 or a later version.
- `docs/visual/class-contract.md`, which makes the class names and the data
  attributes of the renderer a public contract, with a test that holds each
  name. A host that sets `injectStyles: false` gives all the styles, so it needs
  names that do not change in a patch version. The layer groups and the shape of
  the tree stay internal.
- `docs/core.md`, which gives the contract of the headless graph: the model, the
  payload rule, the order of each result, the error codes, and the cost of each
  function.

[unreleased]: https://github.com/nicoseijas/grafojs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nicoseijas/grafojs/releases/tag/v0.1.0
