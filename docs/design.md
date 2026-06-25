# NestJS LangChain Integration Design

[English](design.md) | [한국어](design.ko.md)

## Goal

Make LangChain features feel natural in a Nest app: register work by name,
inject models through Nest tokens, and add tracing, tools, workflows, and graph
docs only when the app needs them.

## Feature Map

| Package                             | You Use It For                                                | Runtime Library                             |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `@nest-langchain/core`              | register runnables and call them by name                      | NestJS                                      |
| `@nest-langchain/langgraph`         | define graph providers and run compiled graphs                | `@langchain/langgraph`                      |
| `@nest-langchain/langsmith`         | trace methods and attach request metadata                     | `langsmith`                                 |
| `@nest-langchain/tools`             | expose decorated Nest methods as tools                        | `@langchain/core`, `zod`                    |
| `@nest-langchain/prompts`           | register and format named prompts                             | `@langchain/core`                           |
| `@nest-langchain/patterns`          | define collaborative tasks and Deep Agents workflows          | `@langchain/core`, optional `deepagents`    |
| `@nest-langchain/visualization`     | serve graph docs, JSON/Mermaid/DOT exports, and saved layouts | hosted docs UI and graph metadata rendering |
| `@nest-langchain/openai`            | provide an OpenAI chat model through a Nest token             | `@langchain/openai`                         |
| `@nest-langchain/openai-compatible` | provide named OpenAI-compatible chat models                   | `@langchain/openai`                         |
| `@nest-langchain/anthropic`         | provide an Anthropic chat model through a Nest token          | `@langchain/anthropic`                      |
| `@nest-langchain/gemini`            | provide a Gemini chat model through a Nest token              | `@langchain/google-genai`                   |
| `@nest-langchain/bedrock`           | provide an AWS Bedrock chat model through a Nest token        | `@langchain/aws`                            |

## Runtime Flow

1. `LangChainModule.forRoot()` registers `LangChainRegistry` and generic scanner utilities.
2. Feature modules register their own discovery/runtime behavior.
3. `LangGraphModule` discovers `@LangGraph` providers, compiles LangGraph runnables, passes configured checkpointers to LangGraph, and registers compiled graphs into core.
4. `LangSmithModule` applies tracing environment and method-level trace wrappers independently.
5. `ToolsModule` discovers `@LangTool` methods and registers LangChain tools into core.
6. `PromptsModule` exposes a named prompt registry.
7. `CollaborativePatternsModule` discovers `@CollaborativeTask` and optional `@DeepAgent` providers, then registers runnable metadata into core.
8. `VisualizationModule.setup(path, app, documentOptions)` registers hosted docs routes before `listen()`.
9. Request handlers read the initialized core registry and serve HTML, JSON, Mermaid, DOT, and layout endpoints.

## Runnable Shape

Runnables use this shape:

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

The same invoke/stream surface works for LangChain runnables, LangGraph
compiled graphs, custom services, and tests.

## LangGraph Decorator Contract

`@nest-langchain/langgraph` provides:

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
execution. Applications handle HTTP framing such as NDJSON or SSE from the
returned async iterables.

LangGraph execution-control patterns map to official primitives:

- command routing uses `Command` and `@GraphNode({ ends })`
- parent handoff uses `Command.PARENT`
- dynamic fan-out uses `Send`
- human-in-the-loop uses `interrupt()` and resume `Command`
- subgraph communication uses explicit state input/output transforms

See [langgraph-patterns.md](langgraph-patterns.md) for the supported mapping.

## Collaborative Patterns Contract

`@nest-langchain/patterns` provides provider collaboration decorators.

- `@CollaborativeTask` binds logical model roles to Nest provider tokens.
- `@TaskStep` supports `invoke`, `parallel`, `structured`, `tool-call`, and `fallback` patterns.
- `PatternsRegistry` lists and invokes discovered tasks through the core registry.
- Model providers are supplied by the app, for example from `@nest-langchain/openai`, `@nest-langchain/openai-compatible`, `@nest-langchain/anthropic`, `@nest-langchain/gemini`, or `@nest-langchain/bedrock`.

Deep Agents support is decorator-based but optional:

- `@DeepAgent` maps to `createDeepAgent`.
- `@DeepAgentTool` wraps methods as LangChain tools.
- `@DeepAgentSubagent` configures specialized subagents for context isolation.
- `skills`, `interruptOn`, `permissions`, `backend`, `memory`, `checkpointer`, and custom `createOptions` pass through to Deep Agents.

Install `deepagents` when using `@DeepAgent`.

## LangSmith Policy

`@nest-langchain/langsmith` centralizes LangSmith environment management.

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

Package dependency drift is covered by `pnpm check:boundaries`.
