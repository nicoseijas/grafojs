export type LayoutErrorCode =
  | "DUPLICATE_NODE"
  | "INVALID_GEOMETRY"
  | "INVALID_INPUT"
  | "INVALID_TREE"
  | "MISSING_NODE";

export class LayoutError extends Error {
  readonly code: LayoutErrorCode;
  readonly id?: string;

  constructor(code: LayoutErrorCode, message: string, id?: string) {
    super(message);
    this.name = "LayoutError";
    this.code = code;
    if (id !== undefined) {
      this.id = id;
    }
  }
}
