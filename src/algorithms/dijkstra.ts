import { GraphError, getEdges, outgoingEdges } from "../core/index.js";
import type { EdgeId, Graph, GraphEdge, NodeId } from "../core/index.js";
import { buildPathResult } from "./path-result.js";
import type { ShortestPathResult } from "./path-result.js";
import { requireNode } from "./require-node.js";

export type EdgeWeight<E> = (edge: GraphEdge<E>) => number;

interface QueueEntry {
  readonly nodeId: NodeId;
  readonly distance: number;
  readonly sequence: number;
}

const comesBefore = (left: QueueEntry, right: QueueEntry): boolean =>
  left.distance < right.distance ||
  (left.distance === right.distance && left.sequence < right.sequence);

const push = (heap: QueueEntry[], entry: QueueEntry): void => {
  heap.push(entry);
  let index = heap.length - 1;

  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    const parent = heap[parentIndex];

    if (parent === undefined || !comesBefore(entry, parent)) {
      break;
    }

    heap[index] = parent;
    index = parentIndex;
  }

  heap[index] = entry;
};

const pop = (heap: QueueEntry[]): QueueEntry | undefined => {
  const first = heap[0];

  if (first === undefined) {
    return undefined;
  }

  const last = heap.pop();

  if (heap.length === 0 || last === undefined) {
    return first;
  }

  let index = 0;
  let left = heap[index * 2 + 1];

  while (left !== undefined) {
    const leftIndex = index * 2 + 1;
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];

    const childIndex =
      right !== undefined && comesBefore(right, left) ? rightIndex : leftIndex;
    const child = heap[childIndex];

    if (child === undefined || !comesBefore(child, last)) {
      break;
    }

    heap[index] = child;
    index = childIndex;
    left = heap[index * 2 + 1];
  }

  heap[index] = last;
  return first;
};

const invalidWeight = (edge: GraphEdge<unknown>, weight: unknown): GraphError =>
  new GraphError({
    code: "INVALID_WEIGHT",
    operation: "run Dijkstra",
    entity: "edge",
    id: edge.id,
    message: `Cannot run Dijkstra: edge "${edge.id}" has invalid weight ${String(weight)}; expected a finite non-negative number.`,
  });

const distanceOverflow = (edgeId: EdgeId): GraphError =>
  new GraphError({
    code: "DISTANCE_OVERFLOW",
    operation: "run Dijkstra",
    entity: "edge",
    id: edgeId,
    message: `Cannot run Dijkstra: the distance through edge "${edgeId}" exceeds the finite number range.`,
  });

/**
 * Finds a minimum-weight path through outgoing edges using Dijkstra's algorithm.
 *
 * The weight function is evaluated exactly once for every edge and must return
 * a finite non-negative number. Equal alternatives follow insertion order.
 * Complexity: O(E log E) time and O(V + E) space.
 */
export const dijkstra = <N, E>(
  graph: Graph<N, E>,
  sourceId: NodeId,
  targetId: NodeId,
  getWeight: EdgeWeight<E>,
): ShortestPathResult<N, E> | undefined => {
  const source = requireNode(graph, sourceId, "run Dijkstra");
  const target = requireNode(graph, targetId, "run Dijkstra");
  const weights = new Map<EdgeId, number>();

  for (const edge of getEdges(graph)) {
    const weight = getWeight(edge);

    if (!Number.isFinite(weight) || weight < 0) {
      throw invalidWeight(edge, weight);
    }

    weights.set(edge.id, weight);
  }

  const distances = new Map<NodeId, number>([[source.id, 0]]);
  const previous = new Map<NodeId, GraphEdge<E>>();
  const heap: QueueEntry[] = [];
  let sequence = 0;

  push(heap, { nodeId: source.id, distance: 0, sequence });

  for (let entry = pop(heap); entry !== undefined; entry = pop(heap)) {
    if (entry.distance !== distances.get(entry.nodeId)) {
      continue;
    }

    if (entry.nodeId === target.id) {
      break;
    }

    for (const edge of outgoingEdges(graph, entry.nodeId)) {
      const weight = weights.get(edge.id);

      if (weight === undefined) {
        throw new Error(
          `Invariant violation: edge "${edge.id}" has no weight entry.`,
        );
      }

      const candidate = entry.distance + weight;

      if (!Number.isFinite(candidate)) {
        throw distanceOverflow(edge.id);
      }

      const current = distances.get(edge.to);

      if (current === undefined || candidate < current) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, edge);
        sequence += 1;
        push(heap, { nodeId: edge.to, distance: candidate, sequence });
      }
    }
  }

  const distance = distances.get(target.id);

  if (distance === undefined) {
    return undefined;
  }

  return buildPathResult(graph, source, target, previous, distance);
};
