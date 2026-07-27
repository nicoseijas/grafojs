import { outgoingEdges } from "../core/index.js";
import type { Graph, GraphEdge, GraphNode, NodeId } from "../core/index.js";
import { buildPathResult } from "./path-result.js";
import type { ShortestPathResult } from "./path-result.js";
import { requireNode } from "./require-node.js";

/**
 * Finds a minimum-hop path through outgoing edges using breadth-first search.
 *
 * Equal alternatives follow edge insertion order.
 * Complexity over the reachable subgraph: O(V + E) time and O(V) space.
 */
export const shortestPath = <N, E>(
  graph: Graph<N, E>,
  sourceId: NodeId,
  targetId: NodeId,
): ShortestPathResult<N, E> | undefined => {
  const source = requireNode(graph, sourceId, "find shortest path");
  const target = requireNode(graph, targetId, "find shortest path");
  const visited = new Set<NodeId>([source.id]);
  const previous = new Map<NodeId, GraphEdge<E>>();
  const queue: GraphNode<N>[] = [source];

  for (const current of queue) {
    if (current.id === target.id) {
      break;
    }

    for (const edge of outgoingEdges(graph, current.id)) {
      if (!visited.has(edge.to)) {
        const next = requireNode(graph, edge.to, "find shortest path");
        visited.add(edge.to);
        previous.set(edge.to, edge);
        queue.push(next);
      }
    }
  }

  const result = buildPathResult(graph, source, target, previous, 0);

  if (result === undefined) {
    return undefined;
  }

  return Object.freeze({
    ...result,
    distance: result.edges.length,
  });
};
