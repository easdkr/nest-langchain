import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { END, START, StateGraph } from '@langchain/langgraph';
import { LangChainRegistry, type RunnableLike } from '@nest-langchain/core';

import {
  GRAPH_NODE_METADATA,
  GRAPH_EDGE_METADATA,
  CONDITIONAL_EDGE_METADATA,
  LANG_GRAPH_CHECKPOINTER,
  LANG_GRAPH_METADATA,
  LANG_GRAPH_MODULE_OPTIONS,
} from './constants';
import type {
  ConditionalEdgeOptions,
  DiscoveredGraphMetadata,
  GraphEdgeOptions,
  LangGraphCheckpointer,
  GraphNodeOptions,
  LangGraphEdge,
  LangGraphModuleOptions,
  LangGraphOptions,
} from './interfaces';

@Injectable()
export class LangGraphExplorer implements OnModuleInit {
  private readonly discoveredGraphs: DiscoveredGraphMetadata[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: LangChainRegistry,
    @Optional()
    @Inject(LANG_GRAPH_MODULE_OPTIONS)
    private readonly options: LangGraphModuleOptions = {},
    @Optional()
    @Inject(LANG_GRAPH_CHECKPOINTER)
    private readonly checkpointer?: LangGraphCheckpointer,
  ) {}

  onModuleInit(): void {
    if (this.options.autoDiscoverGraphs === false) {
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

      this.registerGraph(instance, graphOptions);
    }
  }

  listDiscoveredGraphs(): readonly DiscoveredGraphMetadata[] {
    return this.discoveredGraphs;
  }

  private registerGraph(
    instance: Record<string, unknown>,
    graphOptions: LangGraphOptions,
  ): void {
    const graphName = graphOptions.name ?? instance.constructor.name;
    const nodeDefinitions = this.discoverNodes(instance);

    if (nodeDefinitions.length === 0) {
      throw new Error(
        `LangGraph "${graphName}" must declare at least one @GraphNode method.`,
      );
    }

    const nodeNames = nodeDefinitions.map((node) => node.name);
    this.assertUniqueNodeNames(nodeNames, graphName);

    const decoratedEdges = this.discoverGraphEdges(instance);
    const conditionalEdges = this.discoverConditionalEdges(instance);
    const entry = this.resolveEntry(graphOptions, nodeDefinitions, graphName);
    const finishes = this.normalizeFinishes(
      graphOptions.finish ??
        nodeDefinitions
          .filter((node) => node.options.finish === true)
          .map((node) => node.name),
    );
    const resolvedFinishes =
      finishes.length > 0 ? finishes : [nodeNames.at(-1)!];
    const edges =
      graphOptions.edges ??
      (decoratedEdges.length > 0
        ? decoratedEdges
        : this.defaultEdges(nodeNames));

    this.assertKnownNode(entry, nodeNames, 'entry', graphName);

    for (const finish of resolvedFinishes) {
      this.assertKnownNode(finish, nodeNames, 'finish', graphName);
    }

    for (const [from, to] of edges) {
      this.assertKnownNode(from, nodeNames, 'edge.from', graphName);
      this.assertKnownNode(to, nodeNames, 'edge.to', graphName);
    }

    for (const conditionalEdge of conditionalEdges) {
      this.assertKnownNode(
        conditionalEdge.from,
        nodeNames,
        'conditional.from',
        graphName,
      );

      for (const target of Object.values(conditionalEdge.mapping ?? {})) {
        this.assertKnownNode(
          target,
          nodeNames,
          'conditional.mapping',
          graphName,
        );
      }
    }

    const workflow = new StateGraph(graphOptions.state as never) as any;

    for (const node of nodeDefinitions) {
      const nodeOptions = toStateGraphNodeOptions(node.options);

      if (Object.keys(nodeOptions).length === 0) {
        workflow.addNode(node.name, node.handler);
      } else {
        workflow.addNode(node.name, node.handler, nodeOptions);
      }
    }

    workflow.addEdge(START, entry);

    for (const [from, to] of edges) {
      workflow.addEdge(from, to);
    }

    for (const conditionalEdge of conditionalEdges) {
      workflow.addConditionalEdges(
        conditionalEdge.from,
        conditionalEdge.handler,
        conditionalEdge.mapping,
      );
    }

    for (const finish of resolvedFinishes) {
      workflow.addEdge(finish, END);
    }

    const runnable = workflow.compile(
      typeof this.checkpointer === 'undefined'
        ? undefined
        : {
            checkpointer: this.checkpointer as never,
          },
    ) as RunnableLike;
    const registeredEdges: LangGraphEdge[] = [
      [START, entry],
      ...edges,
      ...nodeDefinitions.flatMap((node) =>
        (node.options.ends ?? []).map((target) => [node.name, target] as const),
      ),
      ...conditionalEdges.flatMap((conditionalEdge) =>
        Object.values(conditionalEdge.mapping ?? {}).map(
          (target) => [conditionalEdge.from, target] as const,
        ),
      ),
      ...resolvedFinishes.map((finish) => [finish, END] as const),
    ];
    const metadata = graphOptions.metadata ?? {};
    const tags = graphOptions.tags ?? [];

    this.registry.registerGraph({
      name: graphName,
      kind: 'graph',
      runnable,
      nodes: nodeNames,
      edges: registeredEdges,
      tags,
      metadata: {
        ...metadata,
        source: 'langgraph',
      },
    });

    this.discoveredGraphs.push({
      name: graphName,
      nodes: nodeNames,
      edges: registeredEdges,
      tags,
      metadata,
    });
  }

  private discoverGraphEdges(
    instance: Record<string, unknown>,
  ): LangGraphEdge[] {
    const options =
      this.reflector.get<GraphEdgeOptions[]>(
        GRAPH_EDGE_METADATA,
        instance.constructor,
      ) ?? [];

    return options.map((edge) => [edge.from, edge.to]);
  }

  private discoverConditionalEdges(instance: Record<string, unknown>): Array<{
    from: string;
    mapping?: Record<string, string>;
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
      const options = this.reflector.get<ConditionalEdgeOptions>(
        CONDITIONAL_EDGE_METADATA,
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
          from: options.from,
          mapping: options.mapping,
          handler: handler.bind(instance),
        },
      ];
    });
  }

  private discoverNodes(instance: Record<string, unknown>): Array<{
    name: string;
    handler: (...args: unknown[]) => unknown;
    options: GraphNodeOptions;
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
          options,
        },
      ];
    });
  }

  private defaultEdges(nodeNames: readonly string[]): LangGraphEdge[] {
    return nodeNames
      .slice(0, -1)
      .map((nodeName, index) => [nodeName, nodeNames[index + 1]]);
  }

  private normalizeFinishes(
    finish: string | readonly string[] | undefined,
  ): readonly string[] {
    if (!finish) {
      return [];
    }

    return typeof finish === 'string' ? [finish] : finish;
  }

  private resolveEntry(
    graphOptions: LangGraphOptions,
    nodeDefinitions: Array<{ name: string; options: GraphNodeOptions }>,
    graphName: string,
  ): string {
    if (graphOptions.entry) {
      return graphOptions.entry;
    }

    const entries = nodeDefinitions.filter(
      (node) => node.options.entry === true,
    );

    if (entries.length > 1) {
      throw new Error(
        `LangGraph "${graphName}" declares multiple entry nodes: ${entries
          .map((node) => node.name)
          .join(', ')}`,
      );
    }

    return entries[0]?.name ?? nodeDefinitions[0].name;
  }

  private assertUniqueNodeNames(
    nodeNames: readonly string[],
    graphName: string,
  ): void {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const nodeName of nodeNames) {
      if (seen.has(nodeName)) {
        duplicates.add(nodeName);
      }

      seen.add(nodeName);
    }

    if (duplicates.size > 0) {
      throw new Error(
        `LangGraph "${graphName}" declares duplicate node names: ${[
          ...duplicates,
        ].join(', ')}`,
      );
    }
  }

  private assertKnownNode(
    nodeName: string,
    nodeNames: readonly string[],
    role: string,
    graphName: string,
  ): void {
    if (!nodeNames.includes(nodeName)) {
      throw new Error(
        `LangGraph "${graphName}" references unknown ${role} node "${nodeName}". Known nodes: ${nodeNames.join(', ')}`,
      );
    }
  }
}

function toStateGraphNodeOptions(
  options: GraphNodeOptions,
): Record<string, unknown> {
  return Object.fromEntries(
    [
      ['ends', options.ends],
      ['metadata', options.metadata],
      ['subgraphs', options.subgraphs],
      ['defer', options.defer],
      ['retryPolicy', options.retryPolicy],
      ['cachePolicy', options.cachePolicy],
      ['timeout', options.timeout],
    ].filter(([, value]) => typeof value !== 'undefined'),
  );
}
