import { Inject, Injectable, Optional } from '@nestjs/common';

import { LANG_CHAIN_OPTIONS } from './constants';
import type {
  LangChainModuleOptions,
  RegisteredRunnable,
  RegisteredGraph,
  RunnableConfigLike,
  RunnableLike,
  RunnableStreamOptionsLike,
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
      throw new Error(
        `Runnable "${registered.name}" must provide an invoke method.`,
      );
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
    return this.listRunnables().filter(
      (registered) => registered.kind === 'graph',
    );
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

  stream<TInput = unknown, TChunk = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): AsyncIterable<TChunk> {
    const registered = this.getRunnable(name);
    const stream = registered.runnable.stream;

    if (typeof stream !== 'function') {
      throw new Error(`Runnable "${name}" does not support stream().`);
    }

    const mergedConfig = this.mergeConfig(config);

    return resolveAsyncIterable(
      stream.call(registered.runnable, input, mergedConfig),
    ) as AsyncIterable<TChunk>;
  }

  streamEvents<TInput = unknown, TEvent = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
    options?: RunnableStreamOptionsLike,
  ): AsyncIterable<TEvent> {
    const registered = this.getRunnable(name);
    const streamEvents = registered.runnable.streamEvents;

    if (typeof streamEvents !== 'function') {
      throw new Error(`Runnable "${name}" does not support streamEvents().`);
    }

    const mergedConfig = this.mergeConfig(config);
    const streamConfig = this.mergeStreamOptions(mergedConfig, options);

    return resolveAsyncIterable(
      streamEvents.call(registered.runnable, input, streamConfig, options),
    ) as AsyncIterable<TEvent>;
  }

  streamGraph<TInput = unknown, TChunk = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): AsyncIterable<TChunk> {
    this.getGraph(name);
    return this.stream<TInput, TChunk>(name, input, config);
  }

  streamGraphEvents<TInput = unknown, TEvent = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
    options?: RunnableStreamOptionsLike,
  ): AsyncIterable<TEvent> {
    this.getGraph(name);
    return this.streamEvents<TInput, TEvent>(name, input, config, options);
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

  private mergeStreamOptions(
    config: RunnableConfigLike,
    options?: RunnableStreamOptionsLike,
  ): RunnableConfigLike {
    if (!options) {
      return config;
    }

    const optionConfig = options as RunnableConfigLike;

    return {
      ...config,
      ...options,
      configurable: {
        ...config.configurable,
        ...optionConfig.configurable,
      },
      metadata: {
        ...config.metadata,
        ...optionConfig.metadata,
      },
      tags: [...(config.tags ?? []), ...(optionConfig.tags ?? [])],
    };
  }
}

async function* resolveAsyncIterable<T>(
  value: AsyncIterable<T> | Promise<AsyncIterable<T>>,
): AsyncIterable<T> {
  const iterable = await value;

  for await (const item of iterable) {
    yield item;
  }
}
