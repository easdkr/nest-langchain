import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { LangChainModule } from '@nest-langchain/core';

import { TOOLS_MODULE_OPTIONS } from './constants';
import type { ToolsModuleOptions } from './interfaces';
import { ToolsExplorer } from './tools.explorer';

@Module({})
export class ToolsModule {
  static forRoot(options: ToolsModuleOptions = {}): DynamicModule {
    return {
      module: ToolsModule,
      global: options.global ?? false,
      imports: [
        DiscoveryModule,
        LangChainModule.forRoot({
          global: options.global,
        }),
      ],
      providers: [
        {
          provide: TOOLS_MODULE_OPTIONS,
          useValue: {
            autoDiscoverTools: true,
            ...options,
          },
        },
        ToolsExplorer,
      ],
      exports: [LangChainModule, ToolsExplorer],
    };
  }
}

