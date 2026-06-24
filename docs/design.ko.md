# NestJS LangChain Integration Design

[English](design.md) | [한국어](design.ko.md)

## Goal

모든 사용자가 모든 integration을 설치하지 않아도 되도록, LangChain 생태계 기능을 NestJS 우선 패키지로 제공합니다.

Core package는 얇게 유지합니다. Optional package가 optional runtime dependency를 소유합니다.

## Package Boundaries

| Package                             | Owns                                                                                                                   | Must Not Own                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `@nest-langchain/core`              | Nest module, registry, runnable-like contract, generic provider scanner                                                | LangGraph, LangSmith, provider SDK, visualization renderer |
| `@nest-langchain/langgraph`         | graph decorator, LangGraph `StateGraph` compile/discovery, `LangGraphRunner`, checkpointer wiring, graph metadata      | LangSmith tracing, provider SDK                            |
| `@nest-langchain/langsmith`         | tracing module, `@TraceableRun`, env setup, request metadata, redaction, sampling hook                                 | graph compilation, provider SDK                            |
| `@nest-langchain/tools`             | `@LangTool`, provider method discovery, LangChain tool wrapper                                                         | graph compilation, tracing, provider SDK                   |
| `@nest-langchain/prompts`           | `PromptsModule`, named prompt registry, prompt template formatting                                                     | graph compilation, tracing, provider SDK                   |
| `@nest-langchain/patterns`          | `@CollaborativeTask`, `@TaskStep`, `@DeepAgent`, `@DeepAgentTool`, `@DeepAgentSubagent`, provider collaboration runner | provider SDK, LangSmith, direct LangGraph dependency       |
| `@nest-langchain/visualization`     | hosted docs UI, JSON/Mermaid/DOT export, layout API/storage                                                            | graph execution, source rewrite                            |
| `@nest-langchain/openai`            | OpenAI provider DI token/factory                                                                                       | graph DSL, registry ownership                              |
| `@nest-langchain/openai-compatible` | OpenAI-compatible provider DI token/factory for named endpoints                                                        | graph DSL, registry ownership                              |
| `@nest-langchain/anthropic`         | Anthropic provider DI token/factory                                                                                    | graph DSL, registry ownership                              |
| `@nest-langchain/gemini`            | Gemini provider DI token/factory                                                                                       | graph DSL, registry ownership                              |
| `@nest-langchain/bedrock`           | AWS Bedrock provider DI token/factory                                                                                  | graph DSL, registry ownership                              |

## Runtime Flow

1. `LangChainModule.forRoot()`가 `LangChainRegistry`와 generic scanner utility를 등록합니다.
2. Optional integration module은 core를 import하고 자기 discovery/runtime behavior를 등록합니다.
3. `LangGraphModule`은 `@LangGraph` provider를 발견하고 LangGraph runnable을 compile하며, configured checkpointer를 LangGraph에 전달하고 compiled graph를 core에 등록합니다.
4. `LangSmithModule`은 tracing environment와 method-level trace wrapper를 독립적으로 적용합니다.
5. `ToolsModule`은 `@LangTool` method를 발견하고 LangChain tool을 core에 등록합니다.
6. `PromptsModule`은 core 없이 named prompt registry를 제공합니다.
7. `CollaborativePatternsModule`은 `@CollaborativeTask`와 optional `@DeepAgent` provider를 발견하고 runnable metadata를 core에 등록합니다.
8. `VisualizationModule.setup(path, app, documentOptions)`는 `listen()` 전에 hosted docs route를 등록합니다.
9. Request handler는 초기화된 core registry를 읽고 HTML, JSON, Mermaid, DOT, layout endpoint를 제공합니다.

## Core Registry Contract

Core는 runnable-like object만 요구합니다.

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

이 구조 덕분에 core는 LangChain을 import하지 않고도 LangChain runnable, LangGraph compiled graph, custom service, test와 호환됩니다.

## LangGraph Decorator Contract

`@nest-langchain/langgraph`가 소유하는 API:

- `@LangGraph`
- `@GraphNode`
- `@GraphEdge`
- `@ConditionalEdge`
- `commandTo`, `parentHandoff`, `sendTo`, `fanOut`, `interruptFor`, `resumeWith`, `callSubgraph`
- `CommandNode`, `RouteCommandNode`, `ParentHandoffNode`

Compiled graph는 core에 `kind: 'graph'`로 등록됩니다.

`LangGraphRunner`는 compiled graph를 실행하는 Nest surface입니다. `LangChainRegistry.invokeGraph()`, `streamGraph()`, `streamGraphEvents()`에 위임하면서 checkpointer-backed invoke/streaming execution에 필요한 `configurable.thread_id` 같은 runnable config를 보존합니다. NDJSON 또는 SSE 같은 HTTP framing은 application controller가 소유합니다.

LangGraph execution-control pattern은 `@langchain/langgraph` primitive에 직접 의존하므로 이 패키지에 남깁니다.

- command routing은 `Command`와 `@GraphNode({ ends })`를 사용합니다.
- parent handoff는 `Command.PARENT`를 사용합니다.
- dynamic fan-out은 `Send`를 사용합니다.
- human-in-the-loop는 `interrupt()`와 resume `Command`를 사용합니다.
- subgraph communication은 명시적인 state input/output transform을 사용합니다.

지원 mapping은 [langgraph-patterns.ko.md](langgraph-patterns.ko.md)를 참고하세요.

## Collaborative Patterns Contract

`@nest-langchain/patterns`는 provider SDK를 소유하지 않고 provider collaboration decorator를 소유합니다.

- `@CollaborativeTask`는 logical model role을 Nest provider token에 binding합니다.
- `@TaskStep`은 `invoke`, `parallel`, `structured`, `tool-call`, `fallback` pattern을 지원합니다.
- `PatternsRegistry`는 발견된 task를 core registry를 통해 나열하고 실행합니다.
- Model provider는 app이 공급합니다. 예: `@nest-langchain/openai`, `@nest-langchain/openai-compatible`, `@nest-langchain/anthropic`, `@nest-langchain/gemini`, `@nest-langchain/bedrock`.

Deep Agents 지원은 decorator 기반이지만 optional입니다.

- `@DeepAgent`는 `createDeepAgent`에 mapping됩니다.
- `@DeepAgentTool`은 method를 LangChain tool로 감쌉니다.
- `@DeepAgentSubagent`는 context isolation을 위한 specialized subagent를 설정합니다.
- `skills`, `interruptOn`, `permissions`, `backend`, `memory`, `checkpointer`, custom `createOptions`는 Deep Agents로 전달됩니다.

`@DeepAgent`를 쓰지 않는 application은 `deepagents`를 설치할 필요가 없습니다.

## LangSmith Policy

`@nest-langchain/langsmith`는 모든 LangSmith import와 environment management를 소유합니다.

- tracing 기본값은 off입니다.
- API key는 public environment snapshot에서 redacted 처리됩니다.
- background callback behavior는 설정할 수 있습니다.
- request metadata는 `LangSmithContext`로 전파할 수 있습니다.
- redaction hook은 LangSmith logging 전에 traced input/output을 변환할 수 있습니다.
- sampling hook은 특정 run에서 trace wrapping을 건너뛸 수 있습니다.

## Visualization Policy

Visualization은 API documentation package처럼 동작합니다.

```text
GET /ai/graphs
GET /ai/graphs/json
GET /ai/graphs/mermaid
GET /ai/graphs/dot
GET /ai/graphs/layouts/:graphId
PUT /ai/graphs/layouts/:graphId
```

Graph source code는 layout editing으로 다시 쓰지 않습니다. Layout은 presentation state입니다.

- read-only storage: save support 없음
- browser/local storage: user-specific layout, repo diff 없음
- file storage: sidecar JSON artifact, 팀이 공유 layout을 원할 때만 repo diff 발생
- database/custom storage: production/admin layout persistence

## Verification

필수 gate:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Boundary check:

- core는 `@langchain/langgraph`, `langsmith`, provider SDK, visualization runtime dependency가 없어야 합니다.
- `@nest-langchain/langgraph`만 `@langchain/langgraph`를 소유합니다.
- `@nest-langchain/langsmith`만 `langsmith`를 소유합니다.
- tool, prompt, patterns package는 `@langchain/core`를 소유합니다.
- `@nest-langchain/patterns`만 `deepagents`를 optional peer로 노출합니다.
- provider package만 각 provider SDK를 소유합니다.
- visualization은 image rendering을 optional로 유지합니다.
