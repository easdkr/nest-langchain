import { SetMetadata } from '@nestjs/common';

import { LANG_GRAPH_METADATA } from '../constants';
import type { LangGraphOptions } from '../interfaces';

export function LangGraph(options: LangGraphOptions): ClassDecorator {
  return (target) => {
    SetMetadata(LANG_GRAPH_METADATA, {
      ...options,
      name: options.name ?? target.name,
    })(target);
  };
}

