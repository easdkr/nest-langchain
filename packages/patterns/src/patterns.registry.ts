import { Injectable } from '@nestjs/common';
import {
  LangChainRegistry,
  type RunnableConfigLike,
} from '@nest-langchain/core';

import type {
  DiscoveredDeepAgentMetadata,
  DiscoveredTaskMetadata,
} from './interfaces';

@Injectable()
export class PatternsRegistry {
  private readonly tasks = new Map<string, DiscoveredTaskMetadata>();
  private readonly deepAgents = new Map<string, DiscoveredDeepAgentMetadata>();

  constructor(private readonly registry: LangChainRegistry) {}

  addTask(metadata: DiscoveredTaskMetadata): void {
    this.tasks.set(metadata.name, metadata);
  }

  addDeepAgent(metadata: DiscoveredDeepAgentMetadata): void {
    this.deepAgents.set(metadata.name, metadata);
  }

  listTasks(): Array<DiscoveredTaskMetadata | DiscoveredDeepAgentMetadata> {
    return [...this.tasks.values(), ...this.deepAgents.values()];
  }

  listDeepAgents(): DiscoveredDeepAgentMetadata[] {
    return Array.from(this.deepAgents.values());
  }

  invoke<TInput = unknown, TOutput = unknown>(
    name: string,
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> {
    return this.registry.invoke<TInput, TOutput>(name, input, config);
  }
}
