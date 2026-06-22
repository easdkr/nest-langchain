import type { RunnableEdge } from '@nest-langchain/core';

export type LangGraphEdge = RunnableEdge;

export interface LangGraphOptions {
  name?: string;
  state: unknown;
  entry?: string;
  finish?: string | readonly string[];
  edges?: readonly LangGraphEdge[];
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
}

export interface GraphNodeOptions {
  name?: string;
  entry?: boolean;
  finish?: boolean;
  ends?: readonly string[];
  metadata?: Record<string, unknown>;
  subgraphs?: unknown[];
  defer?: boolean;
  retryPolicy?: unknown;
  cachePolicy?: unknown;
  timeout?: unknown;
}

export interface GraphEdgeOptions {
  from: string;
  to: string;
}

export interface ConditionalEdgeOptions {
  from: string;
  mapping?: Record<string, string>;
}

export interface LangGraphModuleOptions {
  global?: boolean;
  autoDiscoverGraphs?: boolean;
  checkpointer?: LangGraphCheckpointer;
}

export interface DiscoveredGraphMetadata {
  name: string;
  nodes: readonly string[];
  edges: readonly LangGraphEdge[];
  tags: readonly string[];
  metadata: Record<string, unknown>;
}

export type LangGraphCheckpointer = unknown;

export type GraphCommandTarget =
  | string
  | readonly string[]
  | ((result: unknown, ...args: unknown[]) => string | readonly string[]);

export type GraphCommandUpdate =
  | Record<string, unknown>
  | [string, unknown][]
  | undefined;

export interface GraphCommandOptions {
  update?: GraphCommandUpdate;
  graph?: string;
}

export interface CommandNodeOptions extends GraphNodeOptions {
  to: GraphCommandTarget;
  graph?: string;
  update?:
    | GraphCommandUpdate
    | ((result: unknown, ...args: unknown[]) => GraphCommandUpdate);
}

export type ParentHandoffNodeOptions = CommandNodeOptions;
