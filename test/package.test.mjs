import assert from "node:assert/strict";
import test from "node:test";

import {
  addEdge,
  addNode,
  bfs,
  createGraph,
  dijkstra,
  getNode,
  hasCycle,
  shortestPath,
  stronglyConnectedComponents,
  topologicalSort,
  weaklyConnectedComponents,
} from "grafojs";
import { DEFAULT_VISUAL_CSS, createSvgGraph } from "grafojs/visual";
import { applyLayout, layoutRow } from "grafojs/layout";
import { graphToVisualScene } from "grafojs/adapters";

test("the compiled public entry point is importable", () => {
  const empty = createGraph();
  const graph = addNode(empty, { id: "a", data: { label: "A" } });

  assert.deepEqual(getNode(graph, "a"), {
    id: "a",
    data: { label: "A" },
  });
});

test("compiled algorithms are exported from the public entry point", () => {
  const empty = createGraph();
  const withNodes = addNode(addNode(empty, { id: "a", data: undefined }), {
    id: "b",
    data: undefined,
  });
  const graph = addEdge(withNodes, {
    id: "a-b",
    from: "a",
    to: "b",
    data: undefined,
  });

  assert.deepEqual(
    bfs(graph, "a").map(({ id }) => id),
    ["a", "b"],
  );
  assert.equal(hasCycle(graph), false);
  assert.deepEqual(
    topologicalSort(graph).map(({ id }) => id),
    ["a", "b"],
  );
  assert.deepEqual(
    shortestPath(graph, "a", "b").edges.map(({ id }) => id),
    ["a-b"],
  );
  assert.equal(dijkstra(graph, "a", "b", () => 2).distance, 2);
  assert.deepEqual(
    stronglyConnectedComponents(graph).map((component) =>
      component.map(({ id }) => id),
    ),
    [["a"], ["b"]],
  );
  assert.deepEqual(
    weaklyConnectedComponents(graph).map((component) =>
      component.map(({ id }) => id),
    ),
    [["a", "b"]],
  );
});

test("the compiled visual subpath is importable without browser globals", () => {
  assert.equal(typeof createSvgGraph, "function");
  assert.match(DEFAULT_VISUAL_CSS, /\.gjs-node/);
});

test("the compiled layout subpath positions generic nodes", () => {
  const nodes = [
    { id: "a", width: 100, height: 40 },
    { id: "b", width: 100, height: 40 },
  ];
  const positioned = applyLayout(nodes, layoutRow(nodes, { gap: 20 }));

  assert.deepEqual(positioned, [
    { id: "a", width: 100, height: 40, x: 0, y: 0 },
    { id: "b", width: 100, height: 40, x: 120, y: 0 },
  ]);
});

test("the compiled adapter maps headless topology into a visual scene", () => {
  const graph = createGraph({
    nodes: [{ id: "a", data: { label: "A" } }],
  });
  const scene = graphToVisualScene(graph, {
    width: 200,
    height: 120,
    node: (node) => ({
      x: 20,
      y: 30,
      width: 120,
      height: 64,
      label: node.data.label,
    }),
  });

  assert.deepEqual(scene.nodes[0], {
    id: "a",
    x: 20,
    y: 30,
    width: 120,
    height: 64,
    label: "A",
  });
});
