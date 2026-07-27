# Graph to visual scene adapter

`graphToVisualScene` bridges the immutable headless graph and the visual scene
model. It keeps topology as the source of truth: graph node ids, edge ids, and
edge endpoints are copied into the scene automatically. Consumers only map
presentation.

```ts
import { createGraph, getNodes } from "grafojs";
import { graphToVisualScene } from "grafojs/adapters";
import { layoutRow } from "grafojs/layout";

const graph = createGraph({
  nodes: [
    { id: "client", data: { label: "Client" } },
    { id: "api", data: { label: "API" } },
  ],
  edges: [
    { id: "client-api", from: "client", to: "api", data: { label: "request" } },
  ],
});

const positions = layoutRow(
  getNodes(graph).map((node) => ({ id: node.id, width: 150, height: 72 })),
  { x: 40, y: 120, gap: 72 },
).positions;

const scene = graphToVisualScene(graph, {
  width: 480,
  height: 280,
  ariaLabel: "Client API flow",
  node: (node) => {
    const position = positions.get(node.id);
    if (position === undefined) {
      throw new Error(`Missing position for ${node.id}.`);
    }
    return {
      ...position,
      width: 150,
      height: 72,
      label: node.data.label,
      shape: "pill",
    };
  },
  edge: (edge) => ({ label: edge.data.label, routing: "orthogonal" }),
});
```

The node mapper must return every `VisualNode` field except `id`. The optional
edge mapper returns every `VisualEdge` field except `id`, `from`, and `to`. When
omitted, edges are rendered with default presentation. The adapter validates the
resulting scene before returning it.
