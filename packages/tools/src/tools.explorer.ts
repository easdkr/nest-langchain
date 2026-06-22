import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { tool } from '@langchain/core/tools';
import { LangChainRegistry } from '@nest-langchain/core';

import { LANG_TOOL_METADATA, TOOLS_MODULE_OPTIONS } from './constants';
import { getToolsetOptions } from './decorators/toolset.decorator';
import type { LangToolOptions, ToolsModuleOptions } from './interfaces';

@Injectable()
export class ToolsExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: LangChainRegistry,
    @Optional()
    @Inject(TOOLS_MODULE_OPTIONS)
    private readonly options: ToolsModuleOptions = {},
  ) {}

  onModuleInit(): void {
    if (this.options.autoDiscoverTools === false) {
      return;
    }

    for (const wrapper of this.discoveryService.getProviders()) {
      const instance = wrapper.instance as Record<string, unknown> | undefined;

      if (!instance) {
        continue;
      }

      this.registerTools(instance);
    }
  }

  private registerTools(instance: Record<string, unknown>): void {
    const toolset = getToolsetOptions(instance.constructor);
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype).filter((key) => {
      if (key === 'constructor') {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      return typeof descriptor?.value === 'function';
    });

    for (const methodName of methodNames) {
      const method = prototype[methodName];
      const options = this.reflector.get<LangToolOptions>(
        LANG_TOOL_METADATA,
        method,
      );

      if (!options) {
        continue;
      }

      const handler = instance[methodName];

      if (typeof handler !== 'function') {
        continue;
      }

      const langchainTool = tool(handler.bind(instance), {
        ...options,
        description: options.description ?? `${options.name} tool`,
      });

      this.registry.registerRunnable({
        name: options.name,
        kind: 'tool',
        runnable: langchainTool,
        nodes: [],
        edges: [],
        tags: toolset.tags ?? [],
        metadata: {
          ...toolset.metadata,
          description: options.description,
          source: 'tools',
        },
      });
    }
  }
}
