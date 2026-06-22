# NestJS LangChain Integration Design

## Goal

Provide NestJS-first packages for LangChain ecosystem features without forcing every consumer to install every integration.

The core package stays thin. Optional packages own optional runtime dependencies.

## Package Boundaries

| Package                             | Owns                                                                                                                   | Must Not Own                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@nest-langchain/core`              | Nest module, registry, runnable-like contracts, generic provider scanner                                               | LangGraph, LangSmith, provider SDKs, visualization renderers |
| `@nest-langchain/langgraph`         | graph decorators, LangGraph `StateGraph` compile/discovery, `LangGraphRunner`, checkpointer wiring, graph metadata     | LangSmith tracing, provider SDKs                             |
| `@nest-langchain/langsmith`         | tracing module, `@TraceableRun`, env setup, request metadata, redaction, sampling hooks                                | graph compilation, provider SDKs                             |
| `@nest-langchain/tools`             | `@LangTool`, provider method discovery, LangChain tool wrappers                                                        | graph compilation, tracing, provider SDKs                    |
| `@nest-langchain/prompts`           | `PromptsModule`, named prompt registry, prompt template formatting                                                     | graph compilation, tracing, provider SDKs                    |
| `@nest-langchain/patterns`          | `@CollaborativeTask`, `@TaskStep`, `@DeepAgent`, `@DeepAgentTool`, `@DeepAgentSubagent`, provider collaboration runner | provider SDKs, LangSmith, direct LangGraph dependency        |
| `@nest-langchain/visualization`     | hosted docs UI, JSON/Mermaid/DOT export, layout APIs/storage                                                           | graph execution, source rewrite                              |
| `@nest-langchain/openai`            | OpenAI provider DI token/factory                                                                                       | graph DSL, registry ownership                                |
| `@nest-langchain/openai-compatible` | OpenAI-compatible provider DI token/factory for named endpoints                                                        | graph DSL, registry ownership                                |
| `@nest-langchain/anthropic`         | Anthropic provider DI token/factory                                                                                    | graph DSL, registry ownership                                |
| `@nest-langchain/gemini`            | Gemini provider DI token/factory                                                                                       | graph DSL, registry ownership                                |
| `@nest-langchain/bedrock`           | AWS Bedrock provider DI token/factory                                                                                  | graph DSL, registry ownership                                |

## Runtime Flow

1. `LangChainModule.forRoot()` registers `LangChainRegistry` and generic scanner utilities.
2. Optional integration modules import core and register their own discovery/runtime behavior.
3. `LangGraphModule` discovers `@LangGraph` providers, compiles LangGraph runnables, passes configured checkpointers to LangGraph, and registers compiled graphs into core.
4. `LangSmithModule` applies tracing environment and method-level trace wrappers independently.
5. `ToolsModule` discovers `@LangTool` methods and registers LangChain tools into core.
6. `PromptsModule` exposes a named prompt registry without requiring core.
7. `CollaborativePatternsModule` discovers `@CollaborativeTask` and optional `@DeepAgent` providers, then registers runnable metadata into core.
8. `VisualizationModule.setup(path, app, documentOptions)` registers hosted docs routes before `listen()`.
9. Request handlers read the initialized core registry and serve HTML, JSON, Mermaid, DOT, and layout endpoints.

## Core Registry Contract

Core only requires a runnable-like object:

```ts
interface RunnableStreamOptionsLike {
  [key: string]: unknown;
}

interface RunnableLike<TInput = unknown, TOutput = unknown> {
  invoke(
    input: TInput,
    config?: RunnableConfigLike,
  ): Promise<TOutput> | TOutput;

  stream?(
    input: TInput,
    config?: RunnableConfigLike,
  ): AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>;

  streamEvents?(
    input: TInput,
    config?: RunnableConfigLike,
    options?: RunnableStreamOptionsLike,
  ): AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>;
}
```

This keeps core compatible with LangChain runnables, LangGraph compiled graphs, custom services, and tests without importing LangChain.

## LangGraph Decorator Contract

`@nest-langchain/langgraph` owns:

- `@LangGraph`
- `@GraphNode`
- `@GraphEdge`
- `@ConditionalEdge`
- `commandTo`, `parentHandoff`, `sendTo`, `fanOut`, `interruptFor`, `resumeWith`, `callSubgraph`
- `CommandNode`, `RouteCommandNode`, `ParentHandoffNode`

Compiled graphs are registered into core as `kind: 'graph'`.

`LangGraphRunner` is the Nest execution surface for compiled graphs. It delegates
to `LangChainRegistry.invokeGraph()`, `streamGraph()`, and
`streamGraphEvents()` while preserving runnable config such as
`configurable.thread_id` for checkpointer-backed invoke and streaming
execution. Applications own HTTP framing such as NDJSON or SSE; the packages
return async iterables and do not require LangSmith for streaming.

LangGraph execution-control patterns stay in this package because they depend directly on `@langchain/langgraph` primitives:

- command routing uses `Command` and `@GraphNode({ ends })`
- parent handoff uses `Command.PARENT`
- dynamic fan-out uses `Send`
- human-in-the-loop uses `interrupt()` and resume `Command`
- subgraph communication uses explicit state input/output transforms

See [langgraph-patterns.md](langgraph-patterns.md) for the supported mapping.

## Collaborative Patterns Contract

`@nest-langchain/patterns` owns provider collaboration decorators without owning provider SDKs.

- `@CollaborativeTask` binds logical model roles to Nest provider tokens.
- `@TaskStep` supports `invoke`, `parallel`, `structured`, `tool-call`, and `fallback` patterns.
- `PatternsRegistry` lists and invokes discovered tasks through the core registry.
- Model providers are supplied by the app, for example from `@nest-langchain/openai`, `@nest-langchain/openai-compatible`, `@nest-langchain/anthropic`, `@nest-langchain/gemini`, or `@nest-langchain/bedrock`.

Deep Agents support is decorator-based but optional:

- `@DeepAgent` maps to `createDeepAgent`.
- `@DeepAgentTool` wraps methods as LangChain tools.
- `@DeepAgentSubagent` configures specialized subagents for context isolation.
- `skills`, `interruptOn`, `permissions`, `backend`, `memory`, `checkpointer`, and custom `createOptions` pass through to Deep Agents.

Applications that do not use `@DeepAgent` do not need to install `deepagents`.

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

- core has no `@langchain/langgraph`, `langsmith`, provider SDK, or visualization runtime dependency
- only `@nest-langchain/langgraph` owns `@langchain/langgraph`
- only `@nest-langchain/langsmith` owns `langsmith`
- tool, prompt, and patterns packages own `@langchain/core`
- only `@nest-langchain/patterns` exposes `deepagents` as an optional peer
- only provider packages own their provider SDKs
- visualization keeps image rendering optional
