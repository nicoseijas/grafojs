import {
  fittedNodeHeight,
  NODE_TEXT,
  widestRow,
  type NodeText,
} from "../visual/metrics.js";
import { LayoutError } from "./errors.js";

export type FitNode = NodeText;

export interface FitWidthOptions {
  /**
   * The width of one character, as a share of the font size. The default 0.6
   * is the advance of a common monospace font.
   */
  readonly charWidthRatio?: number;
  /** The prefix that the renderer writes before a role. Defaults to "Role". */
  readonly rolePrefix?: string;
}

const assertLabel = (node: FitNode, operation: string): void => {
  if (typeof node.label !== "string") {
    throw new LayoutError(
      "INVALID_INPUT",
      `${operation} needs a node with a string label.`,
    );
  }
};

const assertRatio = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LayoutError(
      "INVALID_INPUT",
      "charWidthRatio must be a finite number above zero.",
    );
  }
  return value;
};

/**
 * The height that fits the rows of a node.
 *
 * The renderer draws a label, an optional tag, and an optional role. This
 * function gives the height that holds those rows with the same space above
 * the first row and below the last row. It measures nothing, so it gives the
 * same result in a browser, on a server, and in a test.
 */
export const fitNodeHeight = (node: FitNode): number => {
  assertLabel(node, "fitNodeHeight");
  return fittedNodeHeight(node);
};

/**
 * The width that fits the longest row of a node, for a monospace font.
 *
 * Every character of a monospace font has the same width, so this calculation
 * is exact for such a font. A proportional font needs a real measurement, and
 * this function does not give one: for a proportional font, treat the result
 * as a first guess only.
 *
 * The result respects the shape of the node, because a polygon gives less
 * room to text than a rectangle.
 */
export const fitNodeWidth = (
  node: FitNode,
  options: FitWidthOptions = {},
): number => {
  assertLabel(node, "fitNodeWidth");
  const ratio = assertRatio(options.charWidthRatio ?? 0.6);
  const row = widestRow(node, options.rolePrefix ?? "Role");
  const text = row.characters * row.fontSize * ratio;
  const inset = NODE_TEXT.paddingX;

  // Each shape gives the text a different inset, and the inset of a polygon
  // grows with the width. So the width comes from the inverse of the rule that
  // the renderer uses.
  switch (node.shape) {
    case "diamond":
      return text / 0.36;
    case "hexagon":
      return (text + 2 * 12) / 0.56;
    case "ellipse":
      return Math.max(text + 2 * inset, text / 0.7);
    default:
      return text + 2 * inset;
  }
};
