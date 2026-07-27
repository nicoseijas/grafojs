import type { Graph } from "../core/index.js";
import { topologicalSort } from "./topological-sort.js";

/**
 * Reports whether the graph contains at least one directed cycle.
 *
 * Complexity: O(V + E) time and O(V) space.
 */
export const hasCycle = <N, E>(graph: Graph<N, E>): boolean =>
  topologicalSort(graph) === undefined;
