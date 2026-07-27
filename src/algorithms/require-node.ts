import { GraphError, getNode } from "../core/index.js";
import type { Graph, GraphNode, NodeId } from "../core/index.js";

export const requireNode = <N, E>(
  graph: Graph<N, E>,
  start: NodeId,
  operation: string,
): GraphNode<N> => {
  const node = getNode(graph, start);

  if (node === undefined) {
    throw new GraphError({
      code: "UNKNOWN_NODE",
      operation,
      entity: "node",
      id: start,
      message: `Cannot ${operation}: node "${start}" does not exist.`,
    });
  }

  return node;
};
