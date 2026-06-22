import { GRAPH_EDGE_METADATA } from '../constants';
import type { GraphEdgeOptions } from '../interfaces';

export function GraphEdge(options: GraphEdgeOptions): ClassDecorator {
  return (target) => {
    const existing =
      (Reflect.getMetadata(GRAPH_EDGE_METADATA, target) as
        | GraphEdgeOptions[]
        | undefined) ?? [];

    Reflect.defineMetadata(GRAPH_EDGE_METADATA, [...existing, options], target);
  };
}
