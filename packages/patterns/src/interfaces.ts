import type { Type } from "@nestjs/common";
import type { RunnableConfigLike, RunnableLike } from "@nest-langchain/core";

export type ProviderToken = string | symbol | Type<unknown>;

export interface TaskModelBinding {
  role: string;
  token: ProviderToken;
}

export interface CollaborativeTaskOptions {
  name?: string;
  description?: string;
  models: TaskModelBinding[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export type TaskStepPattern =
  | "invoke"
  | "parallel"
  | "structured"
  | "tool-call"
  | "fallback";

export interface TaskStepOptions {
  name?: string;
  pattern?: TaskStepPattern;
  model?: string;
  models?: string[];
  dependsOn?: string[];
  schema?: unknown;
  schemaName?: string;
  tools?: Array<Record<string, unknown>>;
  toolChoice?: unknown;
}

export interface CollaborativePatternsModuleOptions {
  global?: boolean;
  autoDiscoverTasks?: boolean;
  autoDiscoverDeepAgents?: boolean;
}

export interface TaskExecutionContext<TInput = unknown> {
  taskName: string;
  input: TInput;
  steps: Record<string, unknown>;
}

export interface TaskExecutionResult<TOutput = unknown> {
  taskName: string;
  input: unknown;
  steps: Record<string, unknown>;
  output: TOutput;
}

export interface DiscoveredTaskMetadata {
  name: string;
  description?: string;
  nodes: string[];
  edges: Array<readonly [string, string]>;
  models: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface DeepAgentOptions {
  name?: string;
  description?: string;
  model?: string;
  models?: TaskModelBinding[];
  systemPrompt?: string;
  tools?: string[];
  subagents?: string[];
  skills?: string[];
  contextSchema?: unknown;
  responseFormat?: unknown;
  streamTransformers?: unknown;
  interruptOn?: Record<string, unknown>;
  permissions?: unknown;
  middleware?: unknown;
  backend?: unknown;
  filesystem?: unknown;
  memory?: unknown;
  checkpointer?: unknown;
  store?: unknown;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createOptions?: Record<string, unknown>;
}

export interface DeepAgentToolOptions {
  name: string;
  description?: string;
  schema?: unknown;
}

export interface DeepAgentSubagentOptions {
  name: string;
  description: string;
  model?: string;
  systemPrompt?: string;
  tools?: string[];
  skills?: string[];
  contextSchema?: unknown;
  responseFormat?: unknown;
  streamTransformers?: unknown;
  interruptOn?: Record<string, unknown>;
  permissions?: unknown;
  middleware?: unknown;
  backend?: unknown;
  memory?: unknown;
  checkpointer?: unknown;
  store?: unknown;
  createOptions?: Record<string, unknown>;
}

export interface DiscoveredDeepAgentMetadata {
  name: string;
  description?: string;
  nodes: string[];
  models: string[];
  tools: string[];
  subagents: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface RunnableModelLike extends RunnableLike {
  bindTools?: (
    tools: Array<Record<string, unknown>>,
    options?: Record<string, unknown>,
  ) => RunnableLike;
  withStructuredOutput?: (
    schema: unknown,
    options?: Record<string, unknown>,
  ) => RunnableLike;
}

export interface PatternRunnable extends RunnableLike {
  invoke(input: unknown, config?: RunnableConfigLike): Promise<unknown>;
}
