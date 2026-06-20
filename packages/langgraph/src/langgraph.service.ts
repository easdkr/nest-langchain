import { Injectable } from '@nestjs/common';
import {
  LangChainRegistry,
  type RunnableConfigLike,
} from '@nest-langchain/core';

@Injectable()
export class LangGraphService {
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
}
