import {
  createGraph,
  stronglyConnectedComponents,
  weaklyConnectedComponents,
} from "grafojs";

const graph = createGraph({
  nodes: ["a", "b", "c", "isolated"].map((id) => ({
    id,
    data: undefined,
  })),
  edges: [
    { id: "a-b", from: "a", to: "b", data: undefined },
    { id: "b-a", from: "b", to: "a", data: undefined },
    { id: "b-c", from: "b", to: "c", data: undefined },
  ],
});

const ids = (components) =>
  components.map((component) => component.map(({ id }) => id));

console.log(
  "Strongly connected components:",
  ids(stronglyConnectedComponents(graph)),
);
console.log(
  "Weakly connected components:",
  ids(weaklyConnectedComponents(graph)),
);
