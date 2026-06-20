export interface LangSmithOptions {
  enabled?: boolean;
  apiKey?: string;
  endpoint?: string;
  project?: string;
  workspaceId?: string;
  background?: boolean;
}

export interface TraceableRunOptions {
  name?: string;
  runType?: 'llm' | 'chain' | 'tool' | 'retriever' | 'embedding' | 'parser';
  projectName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  tracingEnabled?: boolean;
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

