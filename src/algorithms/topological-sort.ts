import { getNodes, inDegree, outgoingEdges } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";

/**
 * Returns every node in a deterministic topological order.
 *
 * Returns undefined when the graph contains a directed cycle.
 * Complexity: O(V + E) time and O(V) space.
 */
export const topologicalSort = <N, E>(
  graph: Graph<N, E>,
): readonly GraphNode<N>[] | undefined => {
  const nodes = getNodes(graph);
  const remainingInDegree = new Map<NodeId, number>();
  const nodesById = new Map<NodeId, GraphNode<N>>();
  const ready: GraphNode<N>[] = [];
  const result: GraphNode<N>[] = [];

  for (const node of nodes) {
    const degree = inDegree(graph, node.id);
    remainingInDegree.set(node.id, degree);
    nodesById.set(node.id, node);

    if (degree === 0) {
      ready.push(node);
    }
  }

  for (const current of ready) {
    result.push(current);

    for (const edge of outgoingEdges(graph, current.id)) {
      const degree = remainingInDegree.get(edge.to);

      if (degree === undefined) {
        throw new Error(
          `Invariant violation: node "${edge.to}" has no degree entry.`,
        );
      }

      const nextDegree = degree - 1;
      remainingInDegree.set(edge.to, nextDegree);

      if (nextDegree === 0) {
        const next = nodesById.get(edge.to);

        if (next === undefined) {
          throw new Error(
            `Invariant violation: node "${edge.to}" is not indexed.`,
          );
        }

        ready.push(next);
      }
    }
  }

  return result.length === nodes.length ? Object.freeze(result) : undefined;
};
