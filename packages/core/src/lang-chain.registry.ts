import { Inject, Injectable, Optional } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';

import { LANG_CHAIN_OPTIONS } from './constants';
import type {
  LangChainModuleOptions,
  RegisteredGraph,
  RunnableLike,
} from './interfaces';

@Injectable()
export class LangChainRegistry {
  private readonly graphs = new Map<string, RegisteredGraph>();

  constructor(
    @Optional()
    @Inject(LANG_CHAIN_OPTIONS)
    private readonly options: LangChainModuleOptions = {},
  ) {}

  getOptions(): LangChainModuleOptions {
    return this.options;
  }

  registerGraph(graph: RegisteredGraph): void {
    if (this.graphs.has(graph.name)) {
      throw new Error(`LangGraph "${graph.name}" is already registered.`);
    }

    this.graphs.set(graph.name, graph);
  }

  registerRunnable(
    name: string,
    runnable: RunnableLike,
    metadata: Partial<Omit<RegisteredGraph, 'name' | 'runnable'>> = {},
  ): void {
    this.registerGraph({
      name,
      runnable,
      nodes: metadata.nodes ?? [],
      edges: metadata.edges ?? [],
      tags: metadata.tags ?? [],
      metadata: metadata.metadata ?? {},
    });
  }

  getGraph(name: string): RegisteredGraph {
    const graph = this.graphs.get(name);

    if (!graph) {
      throw new Error(`Unknown LangGraph "${name}".`);
    }

    return graph;
  }

  listGraphs(): Array<Omit<RegisteredGraph, 'runnable'>> {
    return Array.from(this.graphs.values()).map(({ runnable: _runnable, ...graph }) => graph);
  }

  async invokeGraph<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfig,
  ): Promise<TOutput> {
    const graph = this.getGraph(name);
    const defaultConfig = this.options.defaultConfig ?? {};
    const mergedConfig = {
      ...defaultConfig,
      ...config,
      configurable: {
        ...defaultConfig.configurable,
        ...config?.configurable,
      },
      metadata: {
        ...defaultConfig.metadata,
        ...config?.metadata,
      },
      tags: [...(defaultConfig.tags ?? []), ...(config?.tags ?? [])],
    };

    return graph.runnable.invoke(input, mergedConfig) as Promise<TOutput>;
  }
}

