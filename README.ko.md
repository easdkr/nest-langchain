# nest-langchain

[English](README.md) | [한국어](README.ko.md)

LangChain 생태계를 NestJS에서 운영 환경에 맞게 사용할 수 있도록 만든 통합 패키지 모음입니다.

이 패키지군은 의도적으로 분리되어 있습니다. `@nest-langchain/core`는 얇게 유지하며 Nest registry/contract만 소유합니다. LangGraph, LangSmith, tools, prompts, visualization, task patterns, provider SDK 통합은 선택 패키지가 각각 소유합니다.

## 패키지

| Package                             | 담당 영역                                                   | Demo                                 |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `@nest-langchain/core`              | registry, runnable contract, 공통 scanner                   | `@nest-langchain/demo-basic`         |
| `@nest-langchain/langgraph`         | LangGraph decorator, discovery, runner, Command/Send helper | `@nest-langchain/demo-langgraph`     |
| `@nest-langchain/langsmith`         | LangSmith runtime config, context, trace decorator          | `@nest-langchain/demo-langsmith`     |
| `@nest-langchain/tools`             | Nest method를 LangChain tool로 노출                         | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/prompts`           | 이름 기반 LangChain prompt template                         | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/patterns`          | collaborative task와 Deep Agents decorator                  | `@nest-langchain/demo-patterns`      |
| `@nest-langchain/visualization`     | 서버 호스팅 graph docs UI와 JSON/Mermaid/DOT endpoint       | `@nest-langchain/demo-visualization` |
| `@nest-langchain/openai`            | OpenAI chat model DI token                                  | `@nest-langchain/demo-providers`     |
| `@nest-langchain/openai-compatible` | OpenAI-compatible chat model DI token                       | `@nest-langchain/demo-providers`     |
| `@nest-langchain/anthropic`         | Anthropic chat model DI token                               | `@nest-langchain/demo-providers`     |
| `@nest-langchain/gemini`            | Gemini chat model DI token                                  | `@nest-langchain/demo-providers`     |
| `@nest-langchain/bedrock`           | AWS Bedrock chat model DI token                             | `@nest-langchain/demo-providers`     |

## 설치 형태

```bash
# registry only
pnpm add @nest-langchain/core

# LangGraph decorators and execution
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph

# LangSmith tracing
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith

# LangChain tools
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod

# prompt templates
pnpm add @nest-langchain/prompts @langchain/core

# provider collaboration and task patterns
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core

# hosted graph docs
pnpm add @nest-langchain/core @nest-langchain/visualization

# provider packages
pnpm add @nest-langchain/openai @langchain/openai
pnpm add @nest-langchain/openai-compatible @langchain/openai
pnpm add @nest-langchain/anthropic @langchain/anthropic
pnpm add @nest-langchain/gemini @langchain/google-genai
pnpm add @nest-langchain/bedrock @langchain/aws
```

Provider 패키지는 Nest DI token을 노출하며 `@nest-langchain/core`를 요구하지 않습니다. `langgraph`, `tools`, `patterns`, `visualization`처럼 runnable을 발견하거나 등록하는 패키지는 core를 peer dependency로 사용합니다.

## 데모

한 번 설치한 뒤 원하는 demo를 실행합니다.

```bash
pnpm install
pnpm check
```

Core registry:

```bash
pnpm --filter @nest-langchain/demo-basic start
curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```

LangGraph:

```bash
pnpm --filter @nest-langchain/demo-langgraph start
curl "http://localhost:3000/graphs"
curl "http://localhost:3000/graphs/support-intake/config"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
curl -X POST "http://localhost:3000/graphs/support-intake/events" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

`demo-langgraph`는 model key 없이 시작할 수 있고, 기본값으로 deterministic drafting을 사용합니다. 관련 환경 변수가 있으면 OpenAI 또는 OpenAI-compatible drafting으로 전환합니다. 고위험 요청은 interrupt를 반환하고 `POST /graphs/support-intake/resume`으로 이어서 실행합니다.

LangSmith tracing:

```bash
pnpm --filter @nest-langchain/demo-langsmith start
curl -X POST "http://localhost:3000/trace" \
  -H "content-type: application/json" \
  -d '{"message":"Customer cannot complete checkout with saved card.","accountId":"acct_live_customer_42"}'
```

Tools and prompts:

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start
curl "http://localhost:3005/prompts"
curl "http://localhost:3005/tools"
```

Patterns:

```bash
pnpm --filter @nest-langchain/demo-patterns start
curl "http://localhost:3004/tasks"
```

Hosted graph docs:

```bash
pnpm --filter @nest-langchain/demo-visualization start
curl "http://localhost:3000/ai/graphs/json"
```

Provider tokens:

```bash
pnpm --filter @nest-langchain/demo-providers start
curl "http://localhost:3006/providers"
```

`demo-providers`는 API key 없이 시작합니다. 필요한 env var가 있을 때만 provider module을 import하고, 실제 model 호출은 `POST /providers/:name/invoke`로 노출합니다.

## Core Registry 예시

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { LangChainModule, LangChainRegistry } from '@nest-langchain/core';

@Module({
  imports: [LangChainModule.forRoot({ global: true })],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit() {
    this.registry.registerRunnable(
      'echo',
      {
        invoke: async (input) => ({ input }),
      },
      {
        kind: 'chain',
        nodes: ['echo'],
        tags: ['demo'],
      },
    );
  }
}
```

## LangGraph 예시

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

## Hosted Visualization 예시

```ts
import {
  FileLayoutStorage,
  VisualizationModule,
} from '@nest-langchain/visualization';

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

Layout editing은 graph source file을 다시 쓰지 않습니다. 공유 layout은 sidecar artifact로 저장하고, runtime/user-specific layout은 custom storage를 사용할 수 있습니다.

## Provider Token 예시

```ts
import { Inject, Injectable, Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
  OpenAIProviderModule,
} from '@nest-langchain/openai';

@Module({
  imports: [OpenAIProviderModule.forRoot()],
  providers: [SupportDraftService],
})
export class AiModule {}

@Injectable()
export class SupportDraftService {
  constructor(
    @Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)
    private readonly model: ChatOpenAI,
  ) {}

  draft(message: string) {
    return this.model.invoke(message);
  }
}
```

## 추가 문서

- [Architecture](docs/architecture.ko.md)
- [Package boundaries](docs/package-boundaries.ko.md)
- [LangGraph patterns](docs/langgraph-patterns.ko.md)
- [Visualization](docs/visualization.ko.md)
- [LangSmith privacy and redaction](docs/langsmith.ko.md)
- [Publishing](docs/publishing.ko.md)
