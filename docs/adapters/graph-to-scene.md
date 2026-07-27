# Graph to visual scene adapter

The `graphToVisualScene` function joins the immutable headless graph and the
visual scene model. The topology stays the source of truth: the function copies
the graph node ids, the edge ids, and the edge endpoints into the scene. The
caller maps only the presentation.

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

The node mapper must return each `VisualNode` field except `id`. The optional
edge mapper returns each `VisualEdge` field except `id`, `from`, and `to`. If
the caller gives no edge mapper, the renderer draws the edges with the default
presentation. The adapter validates the scene before it returns the scene.

## Topology that the visual model does not accept

The headless core is a multigraph. It accepts a self-loop and a parallel edge.
The visual model is smaller, so the caller must handle two cases before the
conversion:

- the adapter rejects a **self-loop**, because no routing can draw an edge whose
  start point and end point are equal. Remove such an edge first, or show it as
  an annotation on the node;
- a **parallel edge** converts correctly and keeps its own id. But two parallel
  edges get the same default geometry, so one edge hides the other. Give each
  edge a different `bend` value from the edge mapper.
