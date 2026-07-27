import type { VisualNodeShape } from "./types.js";

/**
 * The vertical rhythm of the text inside a node.
 *
 * The renderer does not measure text: a measurement needs a document with the
 * font already loaded, and the result would change with the environment. These
 * numbers describe the default styles instead, so the renderer and the fit
 * helpers of `grafojs/layout` always agree.
 */
export const NODE_TEXT = {
  /** The space above the first row and below the last row. */
  padding: 10,
  labelFontSize: 13.5,
  /** The part of the label above its baseline. */
  labelAscent: 10,
  labelDescent: 3,
  /** The distance between two lines of one label. */
  lineHeight: 15.5,
  tagFontSize: 10,
  tagDescent: 2,
  roleFontSize: 11,
  roleDescent: 3,
  /** From the baseline of the label to the baseline of the tag. */
  labelToTag: 22,
  /** From the baseline of the tag to the baseline of the role. */
  tagToRole: 18,
  /** Two rows never come nearer than this. */
  minRowGap: 14,
  /** The space between the border of a rectangle and its text. */
  paddingX: 22,
} as const;

export interface NodeText {
  readonly label: string;
  readonly tag?: string;
  readonly role?: string;
  readonly shape?: VisualNodeShape;
}

export interface NodeRowOffsets {
  /** Each value is a distance from the top border of the node. */
  readonly label: number;
  readonly tag: number;
  readonly role: number;
}

const labelLines = (label: string): number => label.split(/\r?\n/).length;

/**
 * The baseline of each row, as a distance from the top border of the node.
 *
 * The rows sit at the top, because a tall node is a container and its label
 * must stay in the top strip. `fitNodeHeight` gives the height that puts the
 * same space above the first row and below the last row.
 */
export const nodeRowOffsets = (
  node: NodeText,
  height: number,
): NodeRowOffsets => {
  const label = NODE_TEXT.padding + NODE_TEXT.labelAscent;
  const lastLine = label + (labelLines(node.label) - 1) * NODE_TEXT.lineHeight;
  const tag = lastLine + NODE_TEXT.labelToTag;
  // A node without a tag gives that row to the role.
  const rowAbove = node.tag === undefined ? lastLine : tag;
  const wanted =
    node.tag === undefined
      ? lastLine + NODE_TEXT.labelToTag
      : tag + NODE_TEXT.tagToRole;
  // The role stays inside the node, but the gap to the row above wins: text on
  // top of text is unreadable, and text below the border is not.
  const role = Math.max(
    rowAbove + NODE_TEXT.minRowGap,
    Math.min(wanted, height - NODE_TEXT.padding),
  );
  return { label, tag, role };
};

/** The height that fits every row of the node, with equal space above and below. */
export const fittedNodeHeight = (node: NodeText): number => {
  const offsets = nodeRowOffsets(node, Number.POSITIVE_INFINITY);
  if (node.role !== undefined) {
    return offsets.role + NODE_TEXT.roleDescent + NODE_TEXT.padding;
  }
  if (node.tag !== undefined) {
    return offsets.tag + NODE_TEXT.tagDescent + NODE_TEXT.padding;
  }
  const lastLine =
    offsets.label + (labelLines(node.label) - 1) * NODE_TEXT.lineHeight;
  return lastLine + NODE_TEXT.labelDescent + NODE_TEXT.padding;
};

/** The longest row of the node, in characters. */
export const widestRow = (
  node: NodeText,
  rolePrefix: string,
): { readonly characters: number; readonly fontSize: number } => {
  const rows: { characters: number; fontSize: number }[] = node.label
    .split(/\r?\n/)
    .map((line) => ({
      characters: line.length,
      fontSize: NODE_TEXT.labelFontSize,
    }));
  if (node.tag !== undefined) {
    rows.push({ characters: node.tag.length, fontSize: NODE_TEXT.tagFontSize });
  }
  if (node.role !== undefined) {
    rows.push({
      characters: `${rolePrefix}: ${node.role}`.length,
      fontSize: NODE_TEXT.roleFontSize,
    });
  }
  return rows.reduce(
    (widest, row) =>
      row.characters * row.fontSize > widest.characters * widest.fontSize
        ? row
        : widest,
    { characters: 0, fontSize: NODE_TEXT.labelFontSize },
  );
};
