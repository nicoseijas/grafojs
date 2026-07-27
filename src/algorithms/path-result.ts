import { getNode } from "../core/index.js";
import type { Graph, GraphEdge, GraphNode, NodeId } from "../core/index.js";

export interface ShortestPathResult<N, E> {
  readonly nodes: readonly GraphNode<N>[];
  readonly edges: readonly GraphEdge<E>[];
  readonly distance: number;
}

export const buildPathResult = <N, E>(
  graph: Graph<N, E>,
  source: GraphNode<N>,
  target: GraphNode<N>,
  previous: ReadonlyMap<NodeId, GraphEdge<E>>,
  distance: number,
): ShortestPathResult<N, E> | undefined => {
  const reversedEdges: GraphEdge<E>[] = [];
  let current = target.id;

  while (current !== source.id) {
    const edge = previous.get(current);

    if (edge === undefined) {
      return undefined;
    }

    reversedEdges.push(edge);
    current = edge.from;
  }

  const edges = Object.freeze(reversedEdges.reverse());
  const nodes: GraphNode<N>[] = [source];

  for (const edge of edges) {
    const node = getNode(graph, edge.to);

    if (node === undefined) {
      throw new Error(`Invariant violation: node "${edge.to}" is not indexed.`);
    }

    nodes.push(node);
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges,
    distance,
  });
};
