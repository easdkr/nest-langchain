import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { LangChainModule } from '@nest-langchain/core';

import {
  LANG_GRAPH_CHECKPOINTER,
  LANG_GRAPH_MODULE_OPTIONS,
} from './constants';
import type { LangGraphModuleOptions } from './interfaces';
import { LangGraphExplorer } from './langgraph.explorer';
import { LangGraphRunner } from './langgraph.runner';

@Module({})
export class LangGraphModule {
  static forRoot(options: LangGraphModuleOptions = {}): DynamicModule {
    return {
      module: LangGraphModule,
      global: options.global ?? false,
      imports: [
        DiscoveryModule,
        LangChainModule.forRoot({
          global: options.global,
        }),
      ],
      providers: [
        {
          provide: LANG_GRAPH_MODULE_OPTIONS,
          useValue: {
            autoDiscoverGraphs: true,
            ...options,
          },
        },
        {
          provide: LANG_GRAPH_CHECKPOINTER,
          useValue: options.checkpointer,
        },
        LangGraphExplorer,
        LangGraphRunner,
      ],
      exports: [
        LangChainModule,
        LANG_GRAPH_CHECKPOINTER,
        LangGraphExplorer,
        LangGraphRunner,
      ],
    };
  }
}
