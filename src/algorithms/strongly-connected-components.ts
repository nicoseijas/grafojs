import { getNodes, predecessors, successors } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";
import { normalizeComponents } from "./component-result.js";
import type { GraphComponents } from "./component-result.js";

interface DfsFrame<N> {
  readonly node: GraphNode<N>;
  readonly neighbors: readonly GraphNode<N>[];
  nextIndex: number;
}

const finishingOrder = <N, E>(graph: Graph<N, E>): readonly GraphNode<N>[] => {
  const visited = new Set<NodeId>();
  const finished: GraphNode<N>[] = [];

  for (const root of getNodes(graph)) {
    if (visited.has(root.id)) {
      continue;
    }

    visited.add(root.id);
    const stack: DfsFrame<N>[] = [
      { node: root, neighbors: successors(graph, root.id), nextIndex: 0 },
    ];

    for (let frame = stack.at(-1); frame !== undefined; frame = stack.at(-1)) {
      const neighbor = frame.neighbors[frame.nextIndex];

      if (neighbor === undefined) {
        finished.push(frame.node);
        stack.pop();
        continue;
      }

      frame.nextIndex += 1;

      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        stack.push({
          node: neighbor,
          neighbors: successors(graph, neighbor.id),
          nextIndex: 0,
        });
      }
    }
  }

  return finished;
};

/**
 * Partitions the graph into maximal strongly connected components.
 *
 * Components and their members are normalized by node insertion order.
 * Complexity: O(V + E) time and O(V + E) space.
 */
export const stronglyConnectedComponents = <N, E>(
  graph: Graph<N, E>,
): GraphComponents<N> => {
  const nodes = getNodes(graph);
  const roots = [...finishingOrder(graph)].reverse();
  const componentByNode = new Map<NodeId, number>();
  let component = 0;

  for (const root of roots) {
    if (componentByNode.has(root.id)) {
      continue;
    }

    componentByNode.set(root.id, component);
    const stack: GraphNode<N>[] = [root];

    for (
      let current = stack.pop();
      current !== undefined;
      current = stack.pop()
    ) {
      const neighbors = predecessors(graph, current.id);

      for (let index = neighbors.length - 1; index >= 0; index -= 1) {
        const neighbor = neighbors[index];

        if (neighbor !== undefined && !componentByNode.has(neighbor.id)) {
          componentByNode.set(neighbor.id, component);
          stack.push(neighbor);
        }
      }
    }

    component += 1;
  }

  return normalizeComponents(nodes, componentByNode);
};
