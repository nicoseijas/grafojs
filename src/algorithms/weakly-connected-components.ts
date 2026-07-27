import { getEdges, getNodes } from "../core/index.js";
import type { Graph, NodeId } from "../core/index.js";
import { normalizeComponents } from "./component-result.js";
import type { GraphComponents } from "./component-result.js";

/**
 * Partitions the graph into components after ignoring edge direction.
 *
 * Components and their members are normalized by node insertion order.
 * Complexity: O(V + E) time and O(V + E) space.
 */
export const weaklyConnectedComponents = <N, E>(
  graph: Graph<N, E>,
): GraphComponents<N> => {
  const nodes = getNodes(graph);
  const adjacency = new Map<NodeId, NodeId[]>();
  const adjacentIds = new Map<NodeId, Set<NodeId>>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    adjacentIds.set(node.id, new Set());
  }

  const connect = (from: NodeId, to: NodeId): void => {
    const seen = adjacentIds.get(from);
    const neighbors = adjacency.get(from);

    if (seen === undefined || neighbors === undefined) {
      throw new Error(
        `Invariant violation: node "${from}" has no adjacency entry.`,
      );
    }

    if (!seen.has(to)) {
      seen.add(to);
      neighbors.push(to);
    }
  };

  for (const edge of getEdges(graph)) {
    connect(edge.from, edge.to);
    connect(edge.to, edge.from);
  }

  const componentByNode = new Map<NodeId, number>();
  let component = 0;

  for (const root of nodes) {
    if (componentByNode.has(root.id)) {
      continue;
    }

    componentByNode.set(root.id, component);
    const queue: NodeId[] = [root.id];

    for (const current of queue) {
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!componentByNode.has(neighbor)) {
          componentByNode.set(neighbor, component);
          queue.push(neighbor);
        }
      }
    }

    component += 1;
  }

  return normalizeComponents(nodes, componentByNode);
};
