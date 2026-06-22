import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { LangChainModule } from '@nest-langchain/core';

import { PATTERNS_MODULE_OPTIONS } from './constants';
import type { CollaborativePatternsModuleOptions } from './interfaces';
import { PatternsExplorer } from './patterns.explorer';
import { PatternsRegistry } from './patterns.registry';

@Module({})
export class CollaborativePatternsModule {
  static forRoot(
    options: CollaborativePatternsModuleOptions = {},
  ): DynamicModule {
    return {
      module: CollaborativePatternsModule,
      global: options.global ?? false,
      imports: [
        DiscoveryModule,
        LangChainModule.forRoot({
          global: options.global,
        }),
      ],
      providers: [
        {
          provide: PATTERNS_MODULE_OPTIONS,
          useValue: {
            autoDiscoverTasks: true,
            autoDiscoverDeepAgents: true,
            ...options,
          },
        },
        PatternsExplorer,
        PatternsRegistry,
      ],
      exports: [LangChainModule, PatternsExplorer, PatternsRegistry],
    };
  }
}
