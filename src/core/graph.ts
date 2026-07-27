import { GraphError } from "./errors.js";
import type {
  EdgeId,
  Graph,
  GraphEdge,
  GraphInput,
  GraphNode,
  NodeId,
} from "./types.js";

interface GraphState<N, E> {
  readonly nodes: ReadonlyMap<NodeId, GraphNode<N>>;
  readonly edges: ReadonlyMap<EdgeId, GraphEdge<E>>;
  readonly incoming: ReadonlyMap<NodeId, readonly EdgeId[]>;
  readonly outgoing: ReadonlyMap<NodeId, readonly EdgeId[]>;
}

const graphStates = new WeakMap<object, GraphState<unknown, unknown>>();

class GraphValue<N, E> {
  readonly nodeCount: number;
  readonly edgeCount: number;

  constructor(state: GraphState<N, E>) {
    this.nodeCount = state.nodes.size;
    this.edgeCount = state.edges.size;
    graphStates.set(this, state);
    Object.freeze(this);
  }
}

const immutableArray = <T>(values: T[]): readonly T[] => Object.freeze(values);

const invalidId = (
  operation: string,
  entity: "node" | "edge",
  id: unknown,
): GraphError =>
  new GraphError({
    code: "INVALID_ID",
    operation,
    entity,
    id: typeof id === "string" ? id : String(id),
    message: `Cannot ${operation}: ${entity} id must be a string; received ${typeof id}.`,
  });

const invalidInput = (
  operation: string,
  entity: "edge" | "graph" | "node",
  id: string,
  expectation: string,
): GraphError =>
  new GraphError({
    code: "INVALID_INPUT",
    operation,
    entity,
    id,
    message: `Cannot ${operation}: ${id} ${expectation}.`,
  });

type AssertId = (
  id: unknown,
  entity: "node" | "edge",
  operation: string,
) => asserts id is string;

const assertId: AssertId = (id, entity, operation) => {
  if (typeof id !== "string") {
    throw invalidId(operation, entity, id);
  }
};

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value);

const validateNodeRecord = (
  value: unknown,
  operation: string,
  location: string,
): void => {
  if (!isRecord(value)) {
    throw invalidInput(operation, "node", location, "must be an object");
  }

  assertId(value.id, "node", operation);

  if (!("data" in value)) {
    throw invalidInput(
      operation,
      "node",
      location,
      'must contain a "data" property',
    );
  }
};

const validateEdgeRecord = (
  value: unknown,
  operation: string,
  location: string,
): void => {
  if (!isRecord(value)) {
    throw invalidInput(operation, "edge", location, "must be an object");
  }

  assertId(value.id, "edge", operation);
  assertId(value.from, "node", operation);
  assertId(value.to, "node", operation);

  if (!("data" in value)) {
    throw invalidInput(
      operation,
      "edge",
      location,
      'must contain a "data" property',
    );
  }
};

const validateGraphInput = (value: unknown): void => {
  if (!isRecord(value)) {
    throw invalidInput("create graph", "graph", "input", "must be an object");
  }

  if (value.nodes !== undefined) {
    if (!isUnknownArray(value.nodes)) {
      throw invalidInput("create graph", "graph", "nodes", "must be an array");
    }

    value.nodes.forEach((node, index) => {
      validateNodeRecord(node, "create graph", `nodes[${String(index)}]`);
    });
  }

  if (value.edges !== undefined) {
    if (!isUnknownArray(value.edges)) {
      throw invalidInput("create graph", "graph", "edges", "must be an array");
    }

    value.edges.forEach((edge, index) => {
      validateEdgeRecord(edge, "create graph", `edges[${String(index)}]`);
    });
  }
};

const duplicateNode = (id: NodeId, operation: string): GraphError =>
  new GraphError({
    code: "DUPLICATE_NODE",
    operation,
    entity: "node",
    id,
    message: `Cannot ${operation}: node "${id}" already exists.`,
  });

const duplicateEdge = (id: EdgeId, operation: string): GraphError =>
  new GraphError({
    code: "DUPLICATE_EDGE",
    operation,
    entity: "edge",
    id,
    message: `Cannot ${operation}: edge "${id}" already exists.`,
  });

const missingEndpoint = (
  edgeId: EdgeId,
  endpoint: "from" | "to",
  nodeId: NodeId,
  operation: string,
): GraphError =>
  new GraphError({
    code: "MISSING_ENDPOINT",
    operation,
    entity: "edge",
    id: edgeId,
    message: `Cannot ${operation} edge "${edgeId}": ${endpoint} node "${nodeId}" does not exist.`,
  });

const unknownNode = (id: NodeId, operation: string): GraphError =>
  new GraphError({
    code: "UNKNOWN_NODE",
    operation,
    entity: "node",
    id,
    message: `Cannot ${operation}: node "${id}" does not exist.`,
  });

const stateOf = <N, E>(graph: Graph<N, E>): GraphState<N, E> => {
  if (!(graph instanceof GraphValue)) {
    throw new TypeError("Expected a Graph created by grafojs.");
  }

  const state = graphStates.get(graph);

  if (state === undefined) {
    throw new Error("Invariant violation: graph state is not registered.");
  }

  return state as GraphState<N, E>;
};

const requireNode = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
  operation: string,
): GraphState<N, E> => {
  assertId(id, "node", operation);
  const state = stateOf(graph);

  if (!state.nodes.has(id)) {
    throw unknownNode(id, operation);
  }

  return state;
};

export const createGraph = <N = unknown, E = unknown>(
  input: GraphInput<N, E> = {},
): Graph<N, E> => {
  validateGraphInput(input);
  const nodes = new Map<NodeId, GraphNode<N>>();
  const edges = new Map<EdgeId, GraphEdge<E>>();
  const mutableIncoming = new Map<NodeId, EdgeId[]>();
  const mutableOutgoing = new Map<NodeId, EdgeId[]>();

  for (const node of input.nodes ?? []) {
    assertId(node.id, "node", "create graph");

    if (nodes.has(node.id)) {
      throw duplicateNode(node.id, "create graph");
    }

    nodes.set(node.id, Object.freeze({ id: node.id, data: node.data }));
    mutableIncoming.set(node.id, []);
    mutableOutgoing.set(node.id, []);
  }

  for (const edge of input.edges ?? []) {
    assertId(edge.id, "edge", "create graph");
    assertId(edge.from, "node", "create graph");
    assertId(edge.to, "node", "create graph");

    if (edges.has(edge.id)) {
      throw duplicateEdge(edge.id, "create graph");
    }

    if (!nodes.has(edge.from)) {
      throw missingEndpoint(edge.id, "from", edge.from, "create");
    }

    if (!nodes.has(edge.to)) {
      throw missingEndpoint(edge.id, "to", edge.to, "create");
    }

    const storedEdge = Object.freeze({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      data: edge.data,
    });
    edges.set(edge.id, storedEdge);
    mutableOutgoing.get(edge.from)?.push(edge.id);
    mutableIncoming.get(edge.to)?.push(edge.id);
  }

  const incoming = new Map<NodeId, readonly EdgeId[]>();
  const outgoing = new Map<NodeId, readonly EdgeId[]>();

  for (const [id, edgeIds] of mutableIncoming) {
    incoming.set(id, immutableArray(edgeIds));
  }

  for (const [id, edgeIds] of mutableOutgoing) {
    outgoing.set(id, immutableArray(edgeIds));
  }

  const state: GraphState<N, E> = {
    nodes,
    edges,
    incoming,
    outgoing,
  };

  return new GraphValue(state) as unknown as Graph<N, E>;
};

export const getNode = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): GraphNode<N> | undefined => {
  assertId(id, "node", "get node");
  return stateOf(graph).nodes.get(id);
};

export const getEdge = <N, E>(
  graph: Graph<N, E>,
  id: EdgeId,
): GraphEdge<E> | undefined => {
  assertId(id, "edge", "get edge");
  return stateOf(graph).edges.get(id);
};

export const hasNode = <N, E>(graph: Graph<N, E>, id: NodeId): boolean =>
  getNode(graph, id) !== undefined;

export const hasEdge = <N, E>(graph: Graph<N, E>, id: EdgeId): boolean =>
  getEdge(graph, id) !== undefined;

export const getNodes = <N, E>(graph: Graph<N, E>): readonly GraphNode<N>[] =>
  immutableArray([...stateOf(graph).nodes.values()]);

export const getEdges = <N, E>(graph: Graph<N, E>): readonly GraphEdge<E>[] =>
  immutableArray([...stateOf(graph).edges.values()]);

export const addNode = <N, E>(
  graph: Graph<N, E>,
  node: GraphNode<N>,
): Graph<N, E> => {
  validateNodeRecord(node, "add node", "node");

  if (hasNode(graph, node.id)) {
    throw duplicateNode(node.id, "add node");
  }

  return createGraph({
    nodes: [...getNodes(graph), node],
    edges: getEdges(graph),
  });
};

export const addEdge = <N, E>(
  graph: Graph<N, E>,
  edge: GraphEdge<E>,
): Graph<N, E> => {
  validateEdgeRecord(edge, "add edge", "edge");

  if (hasEdge(graph, edge.id)) {
    throw duplicateEdge(edge.id, "add edge");
  }

  if (!hasNode(graph, edge.from)) {
    throw missingEndpoint(edge.id, "from", edge.from, "add");
  }

  if (!hasNode(graph, edge.to)) {
    throw missingEndpoint(edge.id, "to", edge.to, "add");
  }

  return createGraph({
    nodes: getNodes(graph),
    edges: [...getEdges(graph), edge],
  });
};

export const removeNode = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): Graph<N, E> => {
  assertId(id, "node", "remove node");

  if (!hasNode(graph, id)) {
    return graph;
  }

  return createGraph({
    nodes: getNodes(graph).filter((node) => node.id !== id),
    edges: getEdges(graph).filter((edge) => edge.from !== id && edge.to !== id),
  });
};

export const removeEdge = <N, E>(
  graph: Graph<N, E>,
  id: EdgeId,
): Graph<N, E> => {
  assertId(id, "edge", "remove edge");

  if (!hasEdge(graph, id)) {
    return graph;
  }

  return createGraph({
    nodes: getNodes(graph),
    edges: getEdges(graph).filter((edge) => edge.id !== id),
  });
};

export const outgoingEdges = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): readonly GraphEdge<E>[] => {
  const state = requireNode(graph, id, "get outgoing edges");
  return immutableArray(
    (state.outgoing.get(id) ?? []).map((edgeId) => {
      const edge = state.edges.get(edgeId);

      if (edge === undefined) {
        throw new Error(
          `Invariant violation: edge "${edgeId}" is not indexed.`,
        );
      }

      return edge;
    }),
  );
};

export const incomingEdges = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): readonly GraphEdge<E>[] => {
  const state = requireNode(graph, id, "get incoming edges");
  return immutableArray(
    (state.incoming.get(id) ?? []).map((edgeId) => {
      const edge = state.edges.get(edgeId);

      if (edge === undefined) {
        throw new Error(
          `Invariant violation: edge "${edgeId}" is not indexed.`,
        );
      }

      return edge;
    }),
  );
};

export const successors = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): readonly GraphNode<N>[] => {
  const state = requireNode(graph, id, "get successors");
  const seen = new Set<NodeId>();
  const result: GraphNode<N>[] = [];

  for (const edgeId of state.outgoing.get(id) ?? []) {
    const edge = state.edges.get(edgeId);

    if (edge !== undefined && !seen.has(edge.to)) {
      const node = state.nodes.get(edge.to);

      if (node === undefined) {
        throw new Error(
          `Invariant violation: node "${edge.to}" is not indexed.`,
        );
      }

      seen.add(edge.to);
      result.push(node);
    }
  }

  return immutableArray(result);
};

export const predecessors = <N, E>(
  graph: Graph<N, E>,
  id: NodeId,
): readonly GraphNode<N>[] => {
  const state = requireNode(graph, id, "get predecessors");
  const seen = new Set<NodeId>();
  const result: GraphNode<N>[] = [];

  for (const edgeId of state.incoming.get(id) ?? []) {
    const edge = state.edges.get(edgeId);

    if (edge !== undefined && !seen.has(edge.from)) {
      const node = state.nodes.get(edge.from);

      if (node === undefined) {
        throw new Error(
          `Invariant violation: node "${edge.from}" is not indexed.`,
        );
      }

      seen.add(edge.from);
      result.push(node);
    }
  }

  return immutableArray(result);
};

export const outDegree = <N, E>(graph: Graph<N, E>, id: NodeId): number =>
  requireNode(graph, id, "get out-degree").outgoing.get(id)?.length ?? 0;

export const inDegree = <N, E>(graph: Graph<N, E>, id: NodeId): number =>
  requireNode(graph, id, "get in-degree").incoming.get(id)?.length ?? 0;
