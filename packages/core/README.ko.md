# @nest-langchain/core

[English](README.md) | [한국어](README.ko.md)

NestJS 앱에서 runnable을 이름으로 등록하고 실행하고 싶을 때 `@nest-langchain/core`를 사용하세요.

## Install

```bash
pnpm add @nest-langchain/core
```

아직 없다면 Nest peer dependency를 앱에 함께 설치하세요.

```bash
pnpm add @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Module

```ts
import { Module } from '@nestjs/common';
import { LangChainModule } from '@nest-langchain/core';

@Module({
  imports: [
    LangChainModule.forRoot({
      global: true,
      defaultConfig: {
        tags: ['api'],
        metadata: { service: 'support' },
      },
    }),
  ],
})
export class AppModule {}
```

## Runnable 등록

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

@Injectable()
export class SupportRegistry implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit() {
    this.registry.registerRunnable(
      'support-triage',
      {
        invoke: async (input: { message: string }) => ({
          intent: input.message.includes('card') ? 'billing' : 'general',
        }),
      },
      {
        kind: 'chain',
        nodes: ['classify'],
        tags: ['support'],
      },
    );
  }
}
```

처음에는 `invoke()`만 구현하면 됩니다. Streaming이 필요한 runnable에만 `stream()` 또는 `streamEvents()`를 추가하세요.

## 다른 기능 추가

추가하려는 기능에 맞춰 package를 더 설치하세요.

| 이런 작업을 할 때               | 설치                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| LangGraph workflow 작성/실행    | `@nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph` |
| LangSmith로 run tracing         | `@nest-langchain/core @nest-langchain/langsmith langsmith`                            |
| Nest method를 tool로 노출       | `@nest-langchain/core @nest-langchain/tools @langchain/core zod`                      |
| prompt template 관리            | `@nest-langchain/prompts @langchain/core`                                             |
| collaborative task pattern 실행 | `@nest-langchain/core @nest-langchain/patterns @langchain/core`                       |
| graph 문서 화면 제공            | `@nest-langchain/core @nest-langchain/visualization`                                  |
| OpenAI model 주입               | `@nest-langchain/openai @langchain/openai`                                            |
| OpenAI-compatible model 주입    | `@nest-langchain/openai-compatible @langchain/openai`                                 |
| Anthropic model 주입            | `@nest-langchain/anthropic @langchain/anthropic`                                      |
| Gemini model 주입               | `@nest-langchain/gemini @langchain/google-genai`                                      |
| AWS Bedrock model 주입          | `@nest-langchain/bedrock @langchain/aws`                                              |

## Demo

```bash
pnpm install
pnpm --filter @nest-langchain/demo-basic start

curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```
