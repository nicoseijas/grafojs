import {
  addEdge,
  addNode,
  bfs,
  createGraph,
  getNodes,
  successors,
} from "grafojs";

const empty = createGraph();
const withNodes = addNode(
  addNode(empty, { id: "api", data: { label: "API" } }),
  { id: "database", data: { label: "Database" } },
);
const graph = addEdge(withNodes, {
  id: "api-database",
  from: "api",
  to: "database",
  data: { kind: "depends-on" },
});

console.log("Original graph:", {
  nodes: empty.nodeCount,
  edges: empty.edgeCount,
});
console.log(
  "Current nodes:",
  getNodes(graph).map(({ id }) => id),
);
console.log(
  "API successors:",
  successors(graph, "api").map(({ id }) => id),
);
console.log(
  "BFS from API:",
  bfs(graph, "api").map(({ id }) => id),
);
