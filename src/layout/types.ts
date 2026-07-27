export interface LayoutNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export interface LayoutPosition {
  readonly x: number;
  readonly y: number;
}

export interface LayoutBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutResult {
  readonly positions: ReadonlyMap<string, LayoutPosition>;
  readonly bounds: LayoutBounds;
}

export type LayoutAlignment = "start" | "center" | "end";

export interface RowLayoutOptions {
  readonly x?: number;
  readonly y?: number;
  readonly gap?: number;
  readonly align?: LayoutAlignment;
}

export interface ColumnLayoutOptions {
  readonly x?: number;
  readonly y?: number;
  readonly gap?: number;
  readonly align?: LayoutAlignment;
}

export interface TreeLayoutLink {
  readonly from: string;
  readonly to: string;
}

export interface TreeLayoutOptions {
  readonly root?: string;
  readonly x?: number;
  readonly y?: number;
  readonly direction?: "down" | "right";
  readonly levelGap?: number;
  readonly siblingGap?: number;
}

export interface RadialLayoutOptions {
  readonly centerX?: number;
  readonly centerY?: number;
  readonly radius?: number;
  readonly startAngleDegrees?: number;
  readonly sweepAngleDegrees?: number;
}
