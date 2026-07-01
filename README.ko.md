# nest-langchain

[English](README.md) | [한국어](README.ko.md)

NestJS 앱에 LangChain 기능을 필요한 만큼 붙일 수 있는 패키지 모음입니다. 만들려는 기능을 고르고, 맞는 package를 설치한 뒤 Nest module에 연결해 사용하세요.

## 패키지

| Package                             | 이런 작업을 할 때 설치하세요                   | Demo                                 |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------ |
| `@nest-langchain/core`              | 내 runnable을 등록하고 이름으로 실행           | `@nest-langchain/demo-basic`         |
| `@nest-langchain/langgraph`         | LangGraph workflow 작성과 실행                 | `@nest-langchain/demo-langgraph`     |
| `@nest-langchain/langsmith`         | LangSmith tracing과 request metadata 추가      | `@nest-langchain/demo-langsmith`     |
| `@nest-langchain/tools`             | Nest method를 LangChain tool로 노출            | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/prompts`           | prompt template를 이름으로 관리                | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/patterns`          | collaborative task와 Deep Agents workflow 실행 | `@nest-langchain/demo-patterns`      |
| `@nest-langchain/visualization`     | graph docs와 layout endpoint를 app에서 제공    | `@nest-langchain/demo-visualization` |
| `@nest-langchain/openai`            | OpenAI chat model 주입                         | `@nest-langchain/demo-providers`     |
| `@nest-langchain/openai-compatible` | OpenAI-compatible chat model을 이름별로 주입   | `@nest-langchain/demo-providers`     |
| `@nest-langchain/anthropic`         | Anthropic chat model 주입                      | `@nest-langchain/demo-providers`     |
| `@nest-langchain/gemini`            | Gemini chat model 주입                         | `@nest-langchain/demo-providers`     |
| `@nest-langchain/bedrock`           | AWS Bedrock chat model 주입                    | `@nest-langchain/demo-providers`     |

## 설치 예시

```bash
# 내 runnable 등록/실행
pnpm add @nest-langchain/core

# LangGraph workflow 작성/실행
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph

# LangSmith tracing
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith

# Nest method를 tool로 노출
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod

# prompt template 관리
pnpm add @nest-langchain/prompts @langchain/core

# collaborative task pattern 실행
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core

# graph 문서 화면 제공
pnpm add @nest-langchain/core @nest-langchain/visualization

# chat model provider 주입
pnpm add @nest-langchain/openai @langchain/openai
pnpm add @nest-langchain/openai-compatible @langchain/openai
pnpm add @nest-langchain/anthropic @langchain/anthropic
pnpm add @nest-langchain/gemini @langchain/google-genai
pnpm add @nest-langchain/bedrock @langchain/aws
```

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

각 프로바이더 모듈은 연결정보는 모듈 레벨에 두고, 이름별 모델 프리셋을 선언할 수 있다.
프리셋을 이름으로 주입하거나, 팩토리를 주입해 런타임에 모델을 생성한다.

```ts
import { Injectable, Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  InjectOpenAIChatModel,
  InjectOpenAIChatModelFactory,
  OpenAIChatModelFactory,
  OpenAIProviderModule,
} from '@nest-langchain/openai';

@Module({
  imports: [
    OpenAIProviderModule.forRoot({
      apiKey: process.env.OPENAI_API_KEY,
      presets: [
        { name: 'fast', model: 'gpt-4.1-mini', temperature: 0 },
        { name: 'creative', model: 'gpt-4.1', temperature: 0.9 },
      ],
    }),
  ],
  providers: [SupportDraftService],
})
export class AiModule {}

@Injectable()
export class SupportDraftService {
  // 이름별 프리셋 주입
  constructor(
    @InjectOpenAIChatModel('fast') private readonly model: ChatOpenAI,
    @InjectOpenAIChatModelFactory()
    private readonly factory: OpenAIChatModelFactory,
  ) {}

  draft(message: string) {
    return this.model.invoke(message);
  }

  // 원하는 model id / 오버라이드로 런타임 생성
  draftWith(model: string, message: string) {
    return this.factory.create({ model }).invoke(message);
  }
}
```

동적 조회에는 `getOpenAIChatModelToken(name)`을 사용한다. 동일한 팩토리 + 프리셋 패턴이
`@nest-langchain/anthropic`, `gemini`, `bedrock`에도 적용된다(각 패키지 연결정보만 상이).
`@nest-langchain/openai-compatible`은 기존 이름별 토큰과 함께
`InjectOpenAICompatibleModelFactory(name)`을 추가한다.

## 추가 문서

- [Architecture](docs/architecture.ko.md)
- [어떤 패키지를 설치해야 하나요?](docs/package-boundaries.ko.md)
- [LangGraph patterns](docs/langgraph-patterns.ko.md)
- [Visualization](docs/visualization.ko.md)
- [LangSmith privacy and redaction](docs/langsmith.ko.md)
- [Publishing](docs/publishing.ko.md)
