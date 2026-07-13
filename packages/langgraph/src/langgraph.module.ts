import { type DynamicModule, type Provider, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { LangChainModule } from '@nest-langchain/core';

import {
  LANG_GRAPH_CHECKPOINTER,
  LANG_GRAPH_MODULE_OPTIONS,
} from './constants';
import type {
  LangGraphModuleAsyncOptions,
  LangGraphModuleOptions,
} from './interfaces';
import { LangGraphExplorer } from './langgraph.explorer';
import { LangGraphRunner } from './langgraph.runner';

@Module({})
export class LangGraphModule {
  static forRoot(options: LangGraphModuleOptions = {}): DynamicModule {
    const resolved: LangGraphModuleOptions = {
      autoDiscoverGraphs: true,
      ...options,
    };

    return this.buildDynamicModule({
      global: resolved.global ?? false,
      imports: [],
      optionsProvider: {
        provide: LANG_GRAPH_MODULE_OPTIONS,
        useValue: resolved,
      },
    });
  }

  static forRootAsync(options: LangGraphModuleAsyncOptions): DynamicModule {
    return this.buildDynamicModule({
      global: options.global ?? false,
      imports: options.imports ?? [],
      optionsProvider: {
        provide: LANG_GRAPH_MODULE_OPTIONS,
        inject: options.inject ?? [],
        useFactory: async (...args: unknown[]) => ({
          autoDiscoverGraphs: true,
          ...(await options.useFactory(...args)),
          global: options.global,
        }),
      },
    });
  }

  private static buildDynamicModule({
    global,
    imports,
    optionsProvider,
  }: {
    global: boolean;
    imports: NonNullable<DynamicModule['imports']>;
    optionsProvider: Provider;
  }): DynamicModule {
    return {
      module: LangGraphModule,
      global,
      imports: [
        DiscoveryModule,
        LangChainModule.forRoot({ global }),
        ...imports,
      ],
      providers: [
        optionsProvider,
        {
          provide: LANG_GRAPH_CHECKPOINTER,
          inject: [LANG_GRAPH_MODULE_OPTIONS],
          useFactory: (opts: LangGraphModuleOptions) => opts.checkpointer,
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
