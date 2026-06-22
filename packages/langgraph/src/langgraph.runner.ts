import { Injectable } from '@nestjs/common';
import {
  LangChainRegistry,
  type RunnableConfigLike,
  type RunnableStreamOptionsLike,
} from '@nest-langchain/core';

@Injectable()
export class LangGraphRunner {
  constructor(private readonly registry: LangChainRegistry) {}

  listGraphs() {
    return this.registry.listGraphs();
  }

  getGraph(name: string) {
    return this.registry.getGraph(name);
  }

  invoke<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> {
    return this.registry.invokeGraph<TInput, TOutput>(name, input, config);
  }

  stream<TInput = unknown, TChunk = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): AsyncIterable<TChunk> {
    return this.registry.streamGraph<TInput, TChunk>(name, input, config);
  }

  streamEvents<TInput = unknown, TEvent = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
    options?: RunnableStreamOptionsLike,
  ): AsyncIterable<TEvent> {
    return this.registry.streamGraphEvents<TInput, TEvent>(
      name,
      input,
      config,
      options,
    );
  }
}
