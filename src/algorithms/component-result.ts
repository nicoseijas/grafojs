import type { GraphNode, NodeId } from "../core/index.js";

export type GraphComponents<N> = readonly (readonly GraphNode<N>[])[];

export const normalizeComponents = <N>(
  nodes: readonly GraphNode<N>[],
  componentByNode: ReadonlyMap<NodeId, number>,
): GraphComponents<N> => {
  const groups = new Map<number, GraphNode<N>[]>();

  for (const node of nodes) {
    const component = componentByNode.get(node.id);

    if (component === undefined) {
      throw new Error(
        `Invariant violation: node "${node.id}" has no component assignment.`,
      );
    }

    const group = groups.get(component);

    if (group === undefined) {
      groups.set(component, [node]);
    } else {
      group.push(node);
    }
  }

  return Object.freeze(
    [...groups.values()].map((component) => Object.freeze(component)),
  );
};
