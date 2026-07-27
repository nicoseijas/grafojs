import { successors } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";
import { requireNode } from "./require-node.js";

/**
 * Visits nodes reachable through outgoing edges in depth-first pre-order.
 *
 * Ties follow edge insertion order. Each node appears at most once.
 * Complexity over the reachable subgraph: O(V + E) time and O(V) space.
 */
export const dfs = <N, E>(
  graph: Graph<N, E>,
  start: NodeId,
): readonly GraphNode<N>[] => {
  const first = requireNode(graph, start, "run DFS");
  const visited = new Set<NodeId>([start]);
  const stack: GraphNode<N>[] = [first];
  const result: GraphNode<N>[] = [];

  for (
    let current = stack.pop();
    current !== undefined;
    current = stack.pop()
  ) {
    result.push(current);
    const neighbors = successors(graph, current.id);

    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index];

      if (neighbor !== undefined && !visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        stack.push(neighbor);
      }
    }
  }

  return Object.freeze(result);
};
