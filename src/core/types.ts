declare const graphBrand: unique symbol;

export type NodeId = string;
export type EdgeId = string;

export interface GraphNode<N> {
  readonly id: NodeId;
  readonly data: N;
}

export interface GraphEdge<E> {
  readonly id: EdgeId;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly data: E;
}

export interface GraphInput<N, E> {
  readonly nodes?: readonly GraphNode<N>[];
  readonly edges?: readonly GraphEdge<E>[];
}

/**
 * An opaque directed multigraph.
 *
 * Graph values can only be created and transformed through the public
 * functions exported by this package.
 */
export interface Graph<N, E> {
  readonly [graphBrand]: {
    readonly node: N;
    readonly edge: E;
  };
  readonly nodeCount: number;
  readonly edgeCount: number;
}
