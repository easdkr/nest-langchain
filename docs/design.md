# NestJS LangChain Integration Design

## Goal

Provide NestJS-first packages for LangChain ecosystem features without forcing every consumer to install every integration.

The core package stays thin. Optional packages own optional runtime dependencies.

## Package Boundaries

| Package | Owns | Must Not Own |
|---|---|---|
| `@nest-langchain/core` | Nest module, registry, runnable-like contracts, generic provider scanner | LangGraph, LangSmith, provider SDKs, visualization renderers |
| `@nest-langchain/langgraph` | graph decorators, LangGraph `StateGraph` compile/discovery, graph metadata | LangSmith tracing, provider SDKs |
| `@nest-langchain/langsmith` | tracing module, `@TraceableRun`, env setup, request metadata, redaction, sampling hooks | graph compilation, provider SDKs |
| `@nest-langchain/tools` | `@LangTool`, provider method discovery, LangChain tool wrappers | graph compilation, tracing, provider SDKs |
| `@nest-langchain/prompts` | `PromptsModule`, named prompt registry, prompt template formatting | graph compilation, tracing, provider SDKs |
| `@nest-langchain/visualization` | hosted docs UI, JSON/Mermaid/DOT export, layout APIs/storage | graph execution, source rewrite |
| `@nest-langchain/openai` | OpenAI provider DI token/factory | graph DSL, registry ownership |

## Runtime Flow

1. `LangChainModule.forRoot()` registers `LangChainRegistry` and generic scanner utilities.
2. Optional integration modules import core and register their own discovery/runtime behavior.
3. `LangGraphModule` discovers `@LangGraph` providers, compiles LangGraph runnables, and registers them into core.
4. `LangSmithModule` applies tracing environment and method-level trace wrappers independently.
5. `ToolsModule` discovers `@LangTool` methods and registers LangChain tools into core.
6. `PromptsModule` exposes a named prompt registry without requiring core.
7. `VisualizationModule.setup(path, app, documentOptions)` registers hosted docs routes before `listen()`.
8. Request handlers read the initialized core registry and serve HTML, JSON, Mermaid, DOT, and layout endpoints.

## Core Registry Contract

Core only requires a runnable-like object:

```ts
interface RunnableLike<TInput = unknown, TOutput = unknown> {
  invoke(input: TInput, config?: RunnableConfigLike): Promise<TOutput> | TOutput;
}
```

This keeps core compatible with LangChain runnables, LangGraph compiled graphs, custom services, and tests without importing LangChain.

## LangGraph Decorator Contract

`@nest-langchain/langgraph` owns:

- `@LangGraph`
- `@GraphNode`
- `@GraphEdge`
- `@ConditionalEdge`

Compiled graphs are registered into core as `kind: 'graph'`.

## LangSmith Policy

`@nest-langchain/langsmith` owns all LangSmith imports and environment management.

- tracing defaults to off
- API keys are redacted in public environment snapshots
- background callback behavior is configurable
- request metadata can be propagated with `LangSmithContext`
- redaction hooks can transform traced inputs/outputs before LangSmith logging
- sampling hooks can skip trace wrapping for selected runs

## Visualization Policy

Visualization behaves like an API documentation package.

```text
GET /ai/graphs
GET /ai/graphs/json
GET /ai/graphs/mermaid
GET /ai/graphs/dot
GET /ai/graphs/layouts/:graphId
PUT /ai/graphs/layouts/:graphId
```

Graph source code is not rewritten by layout editing. Layout is presentation state:

- read-only storage: no save support
- browser/local storage: user-specific layout, no repo diff
- file storage: sidecar JSON artifacts, repo diff only if the team wants shared layout
- database/custom storage: production/admin layout persistence

## Verification

Required gates:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Boundary checks:

- core has no `@langchain/langgraph`, `langsmith`, `@langchain/openai`, or visualization runtime dependency
- only `@nest-langchain/langgraph` owns `@langchain/langgraph`
- only `@nest-langchain/langsmith` owns `langsmith`
- only tool/prompt/provider packages own `@langchain/core` or provider SDKs
- visualization keeps image rendering optional
