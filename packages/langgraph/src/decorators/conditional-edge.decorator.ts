import { SetMetadata } from '@nestjs/common';

import { CONDITIONAL_EDGE_METADATA } from '../constants';
import type { ConditionalEdgeOptions } from '../interfaces';

export function ConditionalEdge(options: ConditionalEdgeOptions): MethodDecorator {
  return SetMetadata(CONDITIONAL_EDGE_METADATA, options);
}

