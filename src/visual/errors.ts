export type VisualErrorCode =
  | "DUPLICATE_EDGE"
  | "DUPLICATE_NODE"
  | "INVALID_CLASS"
  | "INVALID_GEOMETRY"
  | "INVALID_INPUT"
  | "MISSING_ENDPOINT"
  | "UNKNOWN_EDGE"
  | "UNKNOWN_NODE";

export class VisualError extends Error {
  readonly code: VisualErrorCode;
  readonly entity?: "scene" | "node" | "edge" | "pulse";
  readonly id?: string;

  constructor(
    code: VisualErrorCode,
    message: string,
    context: {
      readonly entity?: "scene" | "node" | "edge" | "pulse";
      readonly id?: string;
    } = {},
  ) {
    super(message);
    this.name = "VisualError";
    this.code = code;
    if (context.entity !== undefined) {
      this.entity = context.entity;
    }
    if (context.id !== undefined) {
      this.id = context.id;
    }
  }
}
