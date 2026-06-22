import { SetMetadata } from '@nestjs/common';

import { GRAPH_NODE_METADATA } from '../constants';
import type { GraphNodeOptions } from '../interfaces';

export function GraphNode(options: GraphNodeOptions = {}): MethodDecorator {
  return SetMetadata(GRAPH_NODE_METADATA, options);
}
