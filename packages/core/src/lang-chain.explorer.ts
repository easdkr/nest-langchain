import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { END, START, StateGraph } from '@langchain/langgraph';

import { GRAPH_NODE_METADATA, LANG_GRAPH_METADATA } from './constants';
import type {
  GraphNodeOptions,
  LangChainModuleOptions,
  LangGraphEdge,
  LangGraphOptions,
  RunnableLike,
} from './interfaces';
import { LangChainRegistry } from './lang-chain.registry';
import { LangSmithEnvironment } from './lang-smith.environment';

@Injectable()
export class LangChainExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: LangChainRegistry,
    private readonly langSmithEnvironment: LangSmithEnvironment,
  ) {}

  onModuleInit(): void {
    const options = this.registry.getOptions();
    this.langSmithEnvironment.apply();

    if (options.autoDiscoverGraphs === false) {
      return;
    }

    for (const wrapper of this.discoveryService.getProviders()) {
      const instance = wrapper.instance as Record<string, unknown> | undefined;

      if (!instance) {
        continue;
      }

      const graphOptions = this.reflector.get<LangGraphOptions>(
        LANG_GRAPH_METADATA,
        instance.constructor,
      );

      if (!graphOptions) {
        continue;
      }

      this.registerGraph(instance, graphOptions, options);
    }
  }

  private registerGraph(
    instance: Record<string, unknown>,
    graphOptions: LangGraphOptions,
    moduleOptions: LangChainModuleOptions,
  ): void {
    const nodeDefinitions = this.discoverNodes(instance);

    if (nodeDefinitions.length === 0) {
      throw new Error(
        `LangGraph "${graphOptions.name}" must declare at least one @GraphNode method.`,
      );
    }

    const nodeNames = nodeDefinitions.map((node) => node.name);
    const entry = graphOptions.entry ?? nodeNames[0];
    const finishes = this.normalizeFinishes(graphOptions.finish ?? nodeNames.at(-1));
    const edges = graphOptions.edges ?? this.defaultEdges(nodeNames);

    this.assertKnownNode(entry, nodeNames, 'entry', graphOptions.name);

    for (const finish of finishes) {
      this.assertKnownNode(finish, nodeNames, 'finish', graphOptions.name);
    }

    for (const [from, to] of edges) {
      this.assertKnownNode(from, nodeNames, 'edge.from', graphOptions.name);
      this.assertKnownNode(to, nodeNames, 'edge.to', graphOptions.name);
    }

    const workflow = new StateGraph(graphOptions.state as never) as any;

    for (const node of nodeDefinitions) {
      workflow.addNode(node.name, node.handler);
    }

    workflow.addEdge(START, entry);

    for (const [from, to] of edges) {
      workflow.addEdge(from, to);
    }

    for (const finish of finishes) {
      workflow.addEdge(finish, END);
    }

    const runnable = workflow.compile() as RunnableLike;
    const registeredEdges: LangGraphEdge[] = [
      [START, entry],
      ...edges,
      ...finishes.map((finish) => [finish, END] as const),
    ];

    this.registry.registerGraph({
      name: graphOptions.name ?? instance.constructor.name,
      runnable,
      nodes: nodeNames,
      edges: registeredEdges,
      tags: graphOptions.tags ?? moduleOptions.defaultConfig?.tags ?? [],
      metadata: graphOptions.metadata ?? {},
    });
  }

  private discoverNodes(instance: Record<string, unknown>): Array<{
    name: string;
    handler: (...args: unknown[]) => unknown;
  }> {
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype).filter((key) => {
      if (key === 'constructor') {
        return false;
      }

      return typeof prototype[key] === 'function';
    });

    return methodNames.flatMap((methodName) => {
      const method = prototype[methodName];
      const options = this.reflector.get<GraphNodeOptions>(
        GRAPH_NODE_METADATA,
        method,
      );

      if (!options) {
        return [];
      }

      const handler = instance[methodName];

      if (typeof handler !== 'function') {
        return [];
      }

      return [
        {
          name: options.name ?? methodName,
          handler: handler.bind(instance),
        },
      ];
    });
  }

  private defaultEdges(nodeNames: readonly string[]): LangGraphEdge[] {
    return nodeNames.slice(0, -1).map((nodeName, index) => [
      nodeName,
      nodeNames[index + 1],
    ]);
  }

  private normalizeFinishes(
    finish: string | readonly string[] | undefined,
  ): readonly string[] {
    if (!finish) {
      return [];
    }

    return typeof finish === 'string' ? [finish] : finish;
  }

  private assertKnownNode(
    nodeName: string,
    nodeNames: readonly string[],
    role: string,
    graphName?: string,
  ): void {
    if (!nodeNames.includes(nodeName)) {
      throw new Error(
        `LangGraph "${graphName}" references unknown ${role} node "${nodeName}". Known nodes: ${nodeNames.join(', ')}`,
      );
    }
  }
}
