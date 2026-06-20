export interface LangSmithOptions {
  enabled?: boolean;
  apiKey?: string;
  endpoint?: string;
  project?: string;
  workspaceId?: string;
  background?: boolean;
  metadata?: LangSmithTraceMetadata;
  requestMetadata?: LangSmithRequestMetadataHook;
  sampling?: LangSmithSamplingHook;
  redactInputs?: LangSmithRedactionHook;
  redactOutputs?: LangSmithRedactionHook;
}

export interface TraceableRunOptions {
  name?: string;
  runType?: 'llm' | 'chain' | 'tool' | 'retriever' | 'embedding' | 'parser';
  projectName?: string;
  tags?: string[];
  metadata?: LangSmithTraceMetadata;
  tracingEnabled?: boolean;
  requestMetadata?: LangSmithRequestMetadataHook;
  sampling?: LangSmithSamplingHook;
  redactInputs?: LangSmithRedactionHook;
  redactOutputs?: LangSmithRedactionHook;
}

export interface AppliedLangSmithEnvironment {
  LANGSMITH_TRACING?: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_ENDPOINT?: string;
  LANGSMITH_PROJECT?: string;
  LANGSMITH_WORKSPACE_ID?: string;
  LANGCHAIN_CALLBACKS_BACKGROUND?: string;
  LANGSMITH_TRACING_BACKGROUND?: string;
}

export type LangSmithTraceMetadata = Record<string, unknown>;

export interface LangSmithHookContext {
  args: unknown[];
  methodName: string;
  metadata: LangSmithTraceMetadata;
}

export type LangSmithRequestMetadataHook = (
  context: LangSmithHookContext,
) => LangSmithTraceMetadata | undefined;

export type LangSmithSamplingHook = (context: LangSmithHookContext) => boolean;

export type LangSmithRedactionHook = (
  value: Readonly<Record<string, unknown>>,
  context: LangSmithHookContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;
