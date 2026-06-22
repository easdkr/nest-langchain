import type {
  DynamicModule,
  ForwardReference,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';

export interface RunnableConfigLike {
  tags?: string[];
  metadata?: Record<string, unknown>;
  configurable?: Record<string, unknown>;
  [key: string]: unknown;
}

export type RunnableEdge = readonly [from: string, to: string];
export type RunnableKind =
  | 'runnable'
  | 'graph'
  | 'chain'
  | 'tool'
  | 'model'
  | 'retriever';

export interface LangChainModuleOptions {
  global?: boolean;
  defaultConfig?: RunnableConfigLike;
}

export interface LangChainModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  global?: boolean;
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<LangChainModuleOptions> | LangChainModuleOptions;
  extraProviders?: Provider[];
}

export interface RunnableLike<TInput = unknown, TOutput = unknown> {
  invoke(
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> | TOutput;
}

export interface RegisteredRunnable {
  name: string;
  kind: RunnableKind;
  runnable: RunnableLike;
  nodes: readonly string[];
  edges: readonly RunnableEdge[];
  tags: readonly string[];
  metadata: Record<string, unknown>;
}

export type RegisteredGraph = RegisteredRunnable;

export type NestImport =
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;
