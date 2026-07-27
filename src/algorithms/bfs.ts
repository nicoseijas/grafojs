import { successors } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";
import { requireNode } from "./require-node.js";

/**
 * Visits nodes reachable through outgoing edges in breadth-first order.
 *
 * Ties follow edge insertion order. Each node appears at most once.
 * Complexity over the reachable subgraph: O(V + E) time and O(V) space.
 */
export const bfs = <N, E>(
  graph: Graph<N, E>,
  start: NodeId,
): readonly GraphNode<N>[] => {
  const first = requireNode(graph, start, "run BFS");
  const visited = new Set<NodeId>([start]);
  const queue: GraphNode<N>[] = [first];
  const result: GraphNode<N>[] = [];

  for (const current of queue) {
    result.push(current);

    for (const neighbor of successors(graph, current.id)) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return Object.freeze(result);
};
