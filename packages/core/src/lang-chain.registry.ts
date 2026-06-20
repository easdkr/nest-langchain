import { Inject, Injectable, Optional } from '@nestjs/common';

import { LANG_CHAIN_OPTIONS } from './constants';
import type {
  LangChainModuleOptions,
  RegisteredRunnable,
  RegisteredGraph,
  RunnableConfigLike,
  RunnableLike,
} from './interfaces';

@Injectable()
export class LangChainRegistry {
  private readonly runnables = new Map<string, RegisteredRunnable>();

  constructor(
    @Optional()
    @Inject(LANG_CHAIN_OPTIONS)
    private readonly options: LangChainModuleOptions = {},
  ) {}

  getOptions(): LangChainModuleOptions {
    return this.options;
  }

  registerRunnable(runnable: RegisteredRunnable): void;
  registerRunnable(
    name: string,
    runnable: RunnableLike,
    metadata?: Partial<Omit<RegisteredRunnable, 'name' | 'runnable'>>,
  ): void;
  registerRunnable(
    nameOrRunnable: string | RegisteredRunnable,
    runnable?: RunnableLike,
    metadata: Partial<Omit<RegisteredRunnable, 'name' | 'runnable'>> = {},
  ): void {
    const registered =
      typeof nameOrRunnable === 'string'
        ? {
            name: nameOrRunnable,
            runnable: runnable as RunnableLike,
            kind: metadata.kind ?? 'runnable',
            nodes: metadata.nodes ?? [],
            edges: metadata.edges ?? [],
            tags: metadata.tags ?? [],
            metadata: metadata.metadata ?? {},
          }
        : nameOrRunnable;

    if (!registered.runnable) {
      throw new Error(`Runnable "${registered.name}" must provide an invoke method.`);
    }

    if (this.runnables.has(registered.name)) {
      throw new Error(`Runnable "${registered.name}" is already registered.`);
    }

    this.runnables.set(registered.name, registered);
  }

  registerGraph(graph: RegisteredGraph): void {
    this.registerRunnable({
      ...graph,
      kind: 'graph',
    });
  }

  getRunnable(name: string): RegisteredRunnable {
    const registered = this.runnables.get(name);

    if (!registered) {
      throw new Error(`Unknown runnable "${name}".`);
    }

    return registered;
  }

  getGraph(name: string): RegisteredGraph {
    const registered = this.getRunnable(name);

    if (registered.kind !== 'graph') {
      throw new Error(`Runnable "${name}" is not a graph.`);
    }

    return registered;
  }

  listRunnables(): Array<Omit<RegisteredRunnable, 'runnable'>> {
    return Array.from(this.runnables.values()).map(
      ({ runnable: _runnable, ...registered }) => registered,
    );
  }

  listGraphs(): Array<Omit<RegisteredGraph, 'runnable'>> {
    return this.listRunnables().filter((registered) => registered.kind === 'graph');
  }

  async invoke<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> {
    const registered = this.getRunnable(name);
    const mergedConfig = this.mergeConfig(config);

    return registered.runnable.invoke(input, mergedConfig) as Promise<TOutput>;
  }

  async invokeGraph<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> {
    this.getGraph(name);
    return this.invoke(name, input, config);
  }

  private mergeConfig(config?: RunnableConfigLike): RunnableConfigLike {
    const defaultConfig = this.options.defaultConfig ?? {};

    return {
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
  }
}
