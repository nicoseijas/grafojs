import { createGraph, getNodes } from "grafojs";
import { graphToVisualScene } from "grafojs/adapters";
import { layoutRow } from "grafojs/layout";

const graph = createGraph({
  nodes: [
    { id: "browser", data: { label: "Browser", shape: "pill" } },
    { id: "api", data: { label: "API", shape: "hexagon" } },
    { id: "worker", data: { label: "Worker", shape: "diamond" } },
  ],
  edges: [
    {
      id: "browser-api",
      from: "browser",
      to: "api",
      data: { label: "request" },
    },
    { id: "api-worker", from: "api", to: "worker", data: { label: "enqueue" } },
  ],
});

const positions = layoutRow(
  getNodes(graph).map((node) => ({ id: node.id, width: 160, height: 80 })),
  { x: 40, y: 150, gap: 80 },
).positions;

const scene = graphToVisualScene(graph, {
  width: 720,
  height: 360,
  ariaLabel: "Browser API worker flow",
  node: (node) => {
    const position = positions.get(node.id);
    if (position === undefined) {
      throw new Error(`Missing position for ${node.id}.`);
    }
    return {
      ...position,
      width: 160,
      height: 80,
      label: node.data.label,
      shape: node.data.shape,
      tag: "service",
    };
  },
  edge: (edge) => ({ label: edge.data.label, routing: "orthogonal" }),
});

console.log(JSON.stringify(scene, null, 2));
