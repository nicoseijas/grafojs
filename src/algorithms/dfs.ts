import { successors } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";
import { requireNode } from "./require-node.js";

/**
 * Visits nodes reachable through outgoing edges in depth-first pre-order.
 *
 * Ties follow edge insertion order. Each node appears at most once.
 * Complexity over the reachable subgraph: O(V + E) time and space.
 *
 * A node is marked visited when it is popped, never when it is pushed. Marking
 * on push lets a shallow branch claim a node that a deeper branch still open
 * must reach first, producing an order that is not a depth-first pre-order.
 */
export const dfs = <N, E>(
  graph: Graph<N, E>,
  start: NodeId,
): readonly GraphNode<N>[] => {
  const first = requireNode(graph, start, "run DFS");
  const visited = new Set<NodeId>();
  const stack: GraphNode<N>[] = [first];
  const result: GraphNode<N>[] = [];

  for (
    let current = stack.pop();
    current !== undefined;
    current = stack.pop()
  ) {
    if (visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);
    result.push(current);
    const neighbors = successors(graph, current.id);

    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index];

      if (neighbor !== undefined && !visited.has(neighbor.id)) {
        stack.push(neighbor);
      }
    }
  }

  return Object.freeze(result);
};
