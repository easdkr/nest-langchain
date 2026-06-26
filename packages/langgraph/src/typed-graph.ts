import type { Command, Send, SendOptions } from '@langchain/langgraph';

import { ConditionalEdge, GraphNode, LangGraph } from './decorators';
import type {
  CommandNodeOptions,
  ConditionalEdgeOptions,
  GraphCommandOptions,
  GraphCommandTarget,
  GraphNodeOptions,
  LangGraphOptions,
} from './interfaces';
import {
  commandTo as commandToNode,
  fanOut as fanOutToNode,
  RouteCommandNode as routeCommandNode,
  sendTo as sendToNode,
} from './patterns';

export type TypedLangGraphNodes = Record<string, string>;

export interface TypedLangGraphDefinition<
  Nodes extends TypedLangGraphNodes = TypedLangGraphNodes,
> {
  name: string;
  state: unknown;
  nodes: Nodes;
}

export type TypedLangGraphNodeKey<T> =
  T extends TypedLangGraphBuilder<infer Nodes>
    ? Extract<keyof Nodes, string>
    : T extends TypedLangGraphDefinition<infer Nodes>
      ? Extract<keyof Nodes, string>
      : T extends TypedLangGraphNodes
        ? Extract<keyof T, string>
        : never;

export type TypedLangGraphNodeName<
  Nodes extends TypedLangGraphNodes,
  Key extends TypedLangGraphNodeKey<Nodes> = TypedLangGraphNodeKey<Nodes>,
> = Nodes[Key] & string;

export type TypedLangGraphEdge<Nodes extends TypedLangGraphNodes> = readonly [
  from: TypedLangGraphNodeKey<Nodes>,
  to: TypedLangGraphNodeKey<Nodes>,
];

export type TypedLangGraphDestination<Nodes extends TypedLangGraphNodes> =
  | TypedLangGraphNodeKey<Nodes>
  | readonly TypedLangGraphNodeKey<Nodes>[];

export type TypedLangGraphCommandTarget<Nodes extends TypedLangGraphNodes> =
  | TypedLangGraphDestination<Nodes>
  | ((result: unknown, ...args: unknown[]) => TypedLangGraphDestination<Nodes>);

export interface TypedLangGraphOptions<
  Nodes extends TypedLangGraphNodes,
> extends Omit<
  LangGraphOptions,
  'name' | 'state' | 'entry' | 'finish' | 'edges'
> {
  name?: string;
  state?: unknown;
  entry?: TypedLangGraphNodeKey<Nodes>;
  finish?: TypedLangGraphDestination<Nodes>;
  edges?: readonly TypedLangGraphEdge<Nodes>[];
}

export interface TypedGraphNodeOptions<
  Nodes extends TypedLangGraphNodes,
> extends Omit<GraphNodeOptions, 'name' | 'ends'> {
  ends?: readonly TypedLangGraphNodeKey<Nodes>[];
}

export interface TypedConditionalEdgeOptions<
  Nodes extends TypedLangGraphNodes,
  Route extends string = string,
> extends Omit<ConditionalEdgeOptions, 'from' | 'mapping'> {
  from: TypedLangGraphNodeKey<Nodes>;
  mapping?: Record<Route, TypedLangGraphNodeKey<Nodes>>;
}

export interface TypedRouteCommandNodeOptions<
  Nodes extends TypedLangGraphNodes,
> extends Omit<CommandNodeOptions, 'name' | 'to' | 'graph' | 'ends'> {
  to: TypedLangGraphCommandTarget<Nodes>;
  ends?: readonly TypedLangGraphNodeKey<Nodes>[];
}

export interface TypedLangGraphBuilder<
  Nodes extends TypedLangGraphNodes,
> extends TypedLangGraphDefinition<Nodes> {
  Graph(options?: Partial<TypedLangGraphOptions<Nodes>>): ClassDecorator;
  Node<Key extends TypedLangGraphNodeKey<Nodes>>(
    key: Key,
    options?: TypedGraphNodeOptions<Nodes>,
  ): MethodDecorator;
  ConditionalEdge<Route extends string = string>(
    options: TypedConditionalEdgeOptions<Nodes, Route>,
  ): MethodDecorator;
  edge(
    from: TypedLangGraphNodeKey<Nodes>,
    to: TypedLangGraphNodeKey<Nodes>,
  ): TypedLangGraphEdge<Nodes>;
  edges(
    ...pairs: readonly TypedLangGraphEdge<Nodes>[]
  ): readonly TypedLangGraphEdge<Nodes>[];
  ends(
    ...keys: readonly TypedLangGraphNodeKey<Nodes>[]
  ): readonly TypedLangGraphNodeKey<Nodes>[];
  commandTo<Update extends Record<string, unknown> = Record<string, unknown>>(
    to: TypedLangGraphDestination<Nodes>,
    options?: Omit<GraphCommandOptions, 'graph'>,
  ): Command<unknown, Update>;
  RouteCommandNode<Key extends TypedLangGraphNodeKey<Nodes>>(
    key: Key,
    options: TypedRouteCommandNodeOptions<Nodes>,
  ): MethodDecorator;
  sendTo<Key extends TypedLangGraphNodeKey<Nodes>, Args>(
    key: Key,
    args: Args,
    options?: SendOptions,
  ): Send<TypedLangGraphNodeName<Nodes, Key>, Args>;
  fanOut<Key extends TypedLangGraphNodeKey<Nodes>, Item, Args>(
    key: Key,
    items: readonly Item[],
    mapInput: (item: Item, index: number) => Args,
    options?:
      | SendOptions
      | ((item: Item, index: number) => SendOptions | undefined),
  ): Array<Send<TypedLangGraphNodeName<Nodes, Key>, Args>>;
  node<Key extends TypedLangGraphNodeKey<Nodes>>(
    key: Key,
  ): TypedLangGraphNodeName<Nodes, Key>;
}

export function defineTypedLangGraph<Nodes extends TypedLangGraphNodes>(
  definition: TypedLangGraphDefinition<Nodes>,
): TypedLangGraphBuilder<Nodes> {
  function node<Key extends TypedLangGraphNodeKey<Nodes>>(
    key: Key,
  ): TypedLangGraphNodeName<Nodes, Key> {
    const name = definition.nodes[key];

    if (typeof name !== 'string') {
      throw new Error(
        `Typed LangGraph "${definition.name}" references unknown node key "${key}".`,
      );
    }

    return name as TypedLangGraphNodeName<Nodes, Key>;
  }

  function mapDestination(
    destination: TypedLangGraphDestination<Nodes>,
  ): string | readonly string[] {
    return typeof destination === 'string'
      ? node(destination)
      : destination.map((key) => node(key));
  }

  function mapCommandTarget(
    target: TypedLangGraphCommandTarget<Nodes>,
  ): GraphCommandTarget {
    if (typeof target !== 'function') {
      return mapDestination(target);
    }

    return (result, ...args) => mapDestination(target(result, ...args));
  }

  function mapEnds(
    keys: readonly TypedLangGraphNodeKey<Nodes>[] | undefined,
  ): readonly string[] | undefined {
    return keys?.map((key) => node(key));
  }

  function mapConditionalMapping<Route extends string>(
    mapping: Record<Route, TypedLangGraphNodeKey<Nodes>> | undefined,
  ): Record<Route, string> | undefined {
    if (!mapping) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(mapping).map(([route, key]) => [
        route,
        node(key as TypedLangGraphNodeKey<Nodes>),
      ]),
    ) as unknown as Record<Route, string>;
  }

  return {
    ...definition,
    Graph(options = {}) {
      const { entry, finish, edges, name, state, ...rest } = options;

      return LangGraph({
        ...rest,
        name: name ?? definition.name,
        state: state ?? definition.state,
        entry: typeof entry === 'undefined' ? undefined : node(entry),
        finish:
          typeof finish === 'undefined' ? undefined : mapDestination(finish),
        edges: edges?.map(([from, to]) => [node(from), node(to)] as const),
      });
    },
    Node(key, options = {}) {
      const { ends, ...rest } = options;

      return GraphNode({
        ...rest,
        name: node(key),
        ends: mapEnds(ends),
      });
    },
    ConditionalEdge(options) {
      return ConditionalEdge({
        from: node(options.from),
        mapping: mapConditionalMapping(options.mapping),
      });
    },
    edge(from, to) {
      return [from, to] as const;
    },
    edges(...pairs) {
      return pairs;
    },
    ends(...keys) {
      return keys;
    },
    commandTo(to, options) {
      return commandToNode(mapDestination(to), options);
    },
    RouteCommandNode(key, options) {
      const { ends, to, ...rest } = options;

      return routeCommandNode({
        ...rest,
        name: node(key),
        to: mapCommandTarget(to),
        ends: mapEnds(ends),
      });
    },
    sendTo(key, args, options) {
      return sendToNode(node(key), args, options);
    },
    fanOut(key, items, mapInput, options) {
      return fanOutToNode(node(key), items, mapInput, options);
    },
    node,
  };
}
