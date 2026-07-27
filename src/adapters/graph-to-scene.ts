import { getEdges, getNodes } from "../core/graph.js";
import type { Graph, GraphEdge, GraphNode } from "../core/types.js";
import { VisualError } from "../visual/errors.js";
import type { VisualEdge, VisualNode, VisualScene } from "../visual/types.js";
import { validateScene } from "../visual/validation.js";

export type GraphSceneNode = Omit<VisualNode, "id">;
export type GraphSceneEdge = Omit<VisualEdge, "id" | "from" | "to">;

export interface GraphSceneAdapterOptions<N, E> {
  readonly width: number;
  readonly height: number;
  readonly ariaLabel?: string;
  /** Maps a graph node to visual presentation. Its graph id is preserved. */
  readonly node: (node: GraphNode<N>, index: number) => GraphSceneNode;
  /** Maps edge presentation. Edge id and endpoints are preserved by default. */
  readonly edge?: (edge: GraphEdge<E>, index: number) => GraphSceneEdge;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const adapterOptions = <N, E>(
  value: GraphSceneAdapterOptions<N, E>,
): GraphSceneAdapterOptions<N, E> => {
  const candidate: unknown = value;
  if (!isRecord(candidate) || typeof candidate.node !== "function") {
    throw new VisualError(
      "INVALID_INPUT",
      "Graph scene adapter options need a node mapping function.",
      { entity: "scene" },
    );
  }
  if (candidate.edge !== undefined && typeof candidate.edge !== "function") {
    throw new VisualError(
      "INVALID_INPUT",
      "Graph scene adapter edge must be a mapping function.",
      { entity: "scene" },
    );
  }
  return value;
};

const mappedRecord = (value: unknown, kind: "node" | "edge"): object => {
  if (!isRecord(value)) {
    throw new VisualError(
      "INVALID_INPUT",
      `Graph scene ${kind} mappings must return an object.`,
      { entity: kind },
    );
  }
  return value;
};

/**
 * Creates a visual scene from immutable graph topology and consumer-supplied
 * presentation mappings. Graph node ids and edge ids/endpoints are preserved.
 */
export const graphToVisualScene = <N, E>(
  graph: Graph<N, E>,
  options: GraphSceneAdapterOptions<N, E>,
): VisualScene => {
  const resolved = adapterOptions(options);
  const nodes = getNodes(graph).map((node, index) => ({
    ...mappedRecord(resolved.node(node, index), "node"),
    id: node.id,
  })) as VisualNode[];
  const edges = getEdges(graph).map((edge, index) => ({
    ...mappedRecord(resolved.edge?.(edge, index) ?? {}, "edge"),
    id: edge.id,
    from: edge.from,
    to: edge.to,
  })) as VisualEdge[];
  const scene: VisualScene = {
    width: resolved.width,
    height: resolved.height,
    ...(resolved.ariaLabel === undefined
      ? {}
      : { ariaLabel: resolved.ariaLabel }),
    nodes,
    edges,
  };
  validateScene(scene);
  return scene;
};
