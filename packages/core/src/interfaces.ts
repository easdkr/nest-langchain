import type {
  DynamicModule,
  ForwardReference,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';

export type LangGraphEdge = readonly [from: string, to: string];

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

export interface LangSmithOptions {
  enabled?: boolean;
  apiKey?: string;
  endpoint?: string;
  project?: string;
  workspaceId?: string;
  background?: boolean;
}

export interface LangChainModuleOptions {
  global?: boolean;
  autoDiscoverGraphs?: boolean;
  defaultConfig?: RunnableConfig;
  langSmith?: LangSmithOptions;
}

export interface LangChainModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  global?: boolean;
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<LangChainModuleOptions> | LangChainModuleOptions;
  extraProviders?: Provider[];
}

export interface RunnableLike<TInput = unknown, TOutput = unknown> {
  invoke(input: TInput, config?: RunnableConfig): Promise<TOutput> | TOutput;
}

export interface RegisteredGraph {
  name: string;
  runnable: RunnableLike;
  nodes: readonly string[];
  edges: readonly LangGraphEdge[];
  tags: readonly string[];
  metadata: Record<string, unknown>;
}

export interface TraceableRunOptions {
  name?: string;
  runType?: 'llm' | 'chain' | 'tool' | 'retriever' | 'embedding' | 'parser';
  projectName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  tracingEnabled?: boolean;
}

export type NestImport = Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference;

