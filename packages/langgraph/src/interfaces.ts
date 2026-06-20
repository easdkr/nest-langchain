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
