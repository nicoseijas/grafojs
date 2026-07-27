export type GraphErrorCode =
  | "DISTANCE_OVERFLOW"
  | "DUPLICATE_EDGE"
  | "DUPLICATE_NODE"
  | "INVALID_ID"
  | "INVALID_INPUT"
  | "INVALID_WEIGHT"
  | "MISSING_ENDPOINT"
  | "UNKNOWN_NODE";

export type GraphEntity = "edge" | "graph" | "node";

export interface GraphErrorDetails {
  readonly code: GraphErrorCode;
  readonly operation: string;
  readonly entity: GraphEntity;
  readonly id: string;
  readonly message: string;
  readonly cause?: unknown;
}

export class GraphError extends Error {
  readonly code: GraphErrorCode;
  readonly operation: string;
  readonly entity: GraphEntity;
  readonly id: string;

  constructor(details: GraphErrorDetails) {
    super(details.message, { cause: details.cause });
    this.name = "GraphError";
    this.code = details.code;
    this.operation = details.operation;
    this.entity = details.entity;
    this.id = details.id;
  }
}
