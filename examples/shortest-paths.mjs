import { createGraph, dijkstra, shortestPath } from "grafojs";

const graph = createGraph({
  nodes: ["a", "b", "c", "d"].map((id) => ({ id, data: { label: id } })),
  edges: [
    { id: "a-b", from: "a", to: "b", data: { cost: 2 } },
    { id: "a-c", from: "a", to: "c", data: { cost: 1 } },
    { id: "c-b", from: "c", to: "b", data: { cost: 0.5 } },
    { id: "b-d", from: "b", to: "d", data: { cost: 2 } },
    { id: "c-d", from: "c", to: "d", data: { cost: 10 } },
  ],
});

const byHops = shortestPath(graph, "a", "d");
const byCost = dijkstra(graph, "a", "d", ({ data }) => data.cost);

console.log("Minimum hops:", {
  edges: byHops?.edges.map(({ id }) => id),
  distance: byHops?.distance,
});
console.log("Minimum cost:", {
  edges: byCost?.edges.map(({ id }) => id),
  distance: byCost?.distance,
});
