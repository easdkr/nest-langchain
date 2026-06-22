# nest-langchain

NestJS에서 LangChain 생태계 기능을 선택 설치 방식으로 쓰기 위한 패키지 모노레포입니다.

핵심 원칙은 `@nest-langchain/core`를 얇게 유지하는 것입니다. core는 Nest module, registry, runnable 계약만 제공하고 LangGraph, LangSmith, tool, prompt, patterns, visualization, provider 연동은 별도 패키지에서 제공합니다.

## Packages

- `@nest-langchain/core`: Nest dynamic module, runnable registry, 공통 scanner/계약
- `@nest-langchain/langgraph`: `@LangGraph`, `@GraphNode`, `@GraphEdge`, `@ConditionalEdge`, graph invoke/stream execution, Command/Send/parent handoff helpers
- `@nest-langchain/langsmith`: `LangSmithModule`, `@TraceableRun`, request metadata/redaction/sampling hook
- `@nest-langchain/tools`: `@LangTool`, Nest provider method discovery, LangChain tool 등록
- `@nest-langchain/prompts`: `PromptsModule`, named prompt registry, LangChain prompt template format
- `@nest-langchain/patterns`: `@CollaborativeTask`, `@TaskStep`, `@DeepAgent`, provider collaboration/delegation patterns
- `@nest-langchain/visualization`: `/ai/graphs` 같은 서버 path에 graph docs UI와 JSON/Mermaid/DOT/layout API 호스팅
- `@nest-langchain/openai`: OpenAI provider token/factory
- `@nest-langchain/openai-compatible`: OpenAI-compatible provider token/factory for MiniMax, Kimi, GLM, and similar endpoints
- `@nest-langchain/anthropic`: Anthropic provider token/factory
- `@nest-langchain/gemini`: Gemini provider token/factory
- `@nest-langchain/bedrock`: AWS Bedrock provider token/factory

## Install Shapes

```bash
# registry only
pnpm add @nest-langchain/core

# LangGraph decorator support
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph

# LangSmith tracing
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith

# LangChain tools
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod

# prompt templates
pnpm add @nest-langchain/prompts @langchain/core

# provider collaboration and modern LangChain task patterns
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core

# Deep Agents decorators, only when @DeepAgent is used
pnpm add deepagents

# hosted graph docs
pnpm add @nest-langchain/core @nest-langchain/visualization

# provider packages
pnpm add @nest-langchain/openai @langchain/openai
pnpm add @nest-langchain/openai-compatible @langchain/openai
pnpm add @nest-langchain/anthropic @langchain/anthropic
pnpm add @nest-langchain/gemini @langchain/google-genai
pnpm add @nest-langchain/bedrock @langchain/aws
```

## Demos

```bash
pnpm install
pnpm check

pnpm --filter @nest-langchain/demo-basic start
pnpm --filter @nest-langchain/demo-langgraph start
pnpm --filter @nest-langchain/demo-langsmith start
pnpm --filter @nest-langchain/demo-patterns start
pnpm --filter @nest-langchain/demo-visualization start
```

The demos run without provider API keys. They use deterministic support and launch-review workflows so the package behavior can be checked locally:

```bash
curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a saved card error.","customerTier":"enterprise","channel":"web"}'
```

The visualization demo hosts graph docs at:

```text
GET /ai/graphs
GET /ai/graphs/json
GET /ai/graphs/mermaid
GET /ai/graphs/dot
GET /ai/graphs/layouts/:graphId
PUT /ai/graphs/layouts/:graphId
```

## LangGraph Example

```ts
import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/langgraph';

const SupportState = Annotation.Root({
  message: Annotation<string>(),
  intent: Annotation<'billing' | 'technical' | 'general'>(),
  response: Annotation<string>(),
});

@LangGraph({
  name: 'support-intake',
  state: SupportState,
})
export class SupportIntakeGraph {
  @GraphNode({ entry: true })
  classifyRequest(state: typeof SupportState.State) {
    return {
      intent: state.message.includes('card') ? 'billing' : 'general',
    };
  }

  @GraphNode({ finish: true })
  draftResponse(state: typeof SupportState.State) {
    return {
      response: `Route ${state.intent} request to support.`,
    };
  }
}
```

```ts
import { Module } from '@nestjs/common';
import { LangGraphModule } from '@nest-langchain/langgraph';

@Module({
  imports: [LangGraphModule.forRoot({ global: true })],
  providers: [SupportIntakeGraph],
})
export class AppModule {}
```

## Hosted Visualization Example

```ts
VisualizationModule.setup(
  '/ai/graphs',
  app,
  {
    title: 'AI Graphs',
  },
  {
    editable: true,
    layout: {
      storage: new FileLayoutStorage('.nest-langchain/layouts'),
    },
  },
);
```

Layout editing does not rewrite graph source files. Shared layouts are sidecar artifacts; runtime/user-specific layouts can use custom storage.

`LangGraphRunner` supports final-result `invoke()` and async-iterable
`stream()` / `streamEvents()` execution. Transport framing such as NDJSON and
SSE stays in the Nest application layer.

## Collaborative Task Example

```ts
@CollaborativeTask({
  name: 'launch-review',
  models: [
    { role: 'planner', token: OPENAI_MODEL },
    { role: 'critic', token: ANTHROPIC_MODEL },
    { role: 'judge', token: GEMINI_MODEL },
  ],
})
export class LaunchReviewTask {
  @TaskStep({
    name: 'drafts',
    pattern: 'parallel',
    models: ['planner', 'critic'],
  })
  drafts(input: { product: string }) {
    return `Draft a launch plan for ${input.product}.`;
  }

  @TaskStep({ name: 'decision', pattern: 'structured', model: 'judge' })
  decision(input: unknown, context: TaskExecutionContext) {
    return `Decide from ${JSON.stringify(context.steps)}.`;
  }
}
```

`@DeepAgent`, `@DeepAgentTool`, and `@DeepAgentSubagent` are available from `@nest-langchain/patterns` when the application installs `deepagents`.

## More Docs

- [Architecture](docs/architecture.md)
- [Package boundaries](docs/package-boundaries.md)
- [LangGraph patterns](docs/langgraph-patterns.md)
- [Visualization](docs/visualization.md)
- [LangSmith privacy and redaction](docs/langsmith.md)
- [Publishing](docs/publishing.md)
