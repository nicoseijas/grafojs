export type VisualEdgeKind = "relation" | "implementation" | "invisible";
export type VisualEdgeDirection = "forward" | "both" | "none";
export type VisualEdgeRouting = "curve" | "straight" | "orthogonal";
export type VisualNodeShape =
  "rect" | "pill" | "ellipse" | "diamond" | "hexagon";
export type PulseKind = "call" | "return" | "error";

export interface VisualNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  /** Defaults to rect, preserving the rounded-rectangle appearance. */
  readonly shape?: VisualNodeShape;
  readonly tag?: string;
  readonly role?: string;
  readonly classes?: readonly string[];
}

export interface VisualEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly kind?: VisualEdgeKind;
  readonly direction?: VisualEdgeDirection;
  /** Defaults to curve. bend only applies to curved routes. */
  readonly routing?: VisualEdgeRouting;
  readonly bend?: number;
  readonly classes?: readonly string[];
}

export interface VisualScene {
  readonly width: number;
  readonly height: number;
  readonly ariaLabel?: string;
  readonly nodes: readonly VisualNode[];
  readonly edges: readonly VisualEdge[];
}

export interface VisualTargets {
  readonly nodes?: readonly string[];
  readonly edges?: readonly string[];
}

export interface VisualVisibility {
  readonly hidden?: VisualTargets;
}

export interface VisualEffects {
  readonly hot?: VisualTargets;
  readonly stress?: VisualTargets;
  readonly muted?: VisualTargets;
}

export interface PulseLeg {
  readonly edge: string;
  readonly reverse?: boolean;
}

export interface PulseOptions {
  readonly kind?: PulseKind;
  /** Duration of each leg, in milliseconds. */
  readonly durationMs?: number;
  readonly radius?: number;
}

export type PulseResult = "completed" | "cancelled" | "reduced-motion";

export interface SvgGraphOptions {
  /** Inject grafojs default styles into the SVG. Defaults to true. */
  readonly injectStyles?: boolean;
  /** Overrides the platform reduced-motion preference. */
  readonly reducedMotion?: () => boolean;
  /** Label placed before a node role. Defaults to "Role". */
  readonly rolePrefix?: string;
}

export interface SvgGraphView {
  render(scene: VisualScene): void;
  setVisibility(visibility: VisualVisibility): void;
  setEffects(effects: VisualEffects): void;
  setRolesVisible(visible: boolean): void;
  setNodeClass(id: string, className: string, enabled: boolean): void;
  setEdgeClass(id: string, className: string, enabled: boolean): void;
  pulse(
    legs: readonly PulseLeg[],
    options?: PulseOptions,
  ): Promise<PulseResult>;
  destroy(): void;
}
