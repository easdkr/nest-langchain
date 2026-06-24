# @nest-langchain/core

[English](README.md) | [한국어](README.ko.md)

Optional LangChain ecosystem package를 위한 얇은 NestJS registry와 shared contract입니다.

`@nest-langchain/core`는 Nest module, runnable registry, structural runnable contract, decorated-provider scanner만 소유합니다. LangGraph, LangSmith, provider SDK, prompt template, tool, visualization renderer에는 의도적으로 의존하지 않습니다.

## Install

```bash
pnpm add @nest-langchain/core
```

Peer dependency는 host Nest application에서 제공합니다.

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

## Register A Runnable

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

`invoke()`만 필수 method입니다. `stream()`과 `streamEvents()`는 optional structural method이므로, integration package는 core에 LangChain runtime type을 강제하지 않고 streaming을 노출할 수 있습니다.

## Optional Packages

Core는 얇게 유지됩니다. 필요한 feature를 소유한 package를 설치하세요.

| Feature                         | Packages                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| LangGraph decorators and runner | `@nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph` |
| LangSmith tracing               | `@nest-langchain/core @nest-langchain/langsmith langsmith`                            |
| LangChain tools                 | `@nest-langchain/core @nest-langchain/tools @langchain/core zod`                      |
| Prompt registry                 | `@nest-langchain/prompts @langchain/core`                                             |
| Collaborative task patterns     | `@nest-langchain/core @nest-langchain/patterns @langchain/core`                       |
| Hosted graph docs               | `@nest-langchain/core @nest-langchain/visualization`                                  |
| OpenAI model token              | `@nest-langchain/openai @langchain/openai`                                            |
| OpenAI-compatible model token   | `@nest-langchain/openai-compatible @langchain/openai`                                 |
| Anthropic model token           | `@nest-langchain/anthropic @langchain/anthropic`                                      |
| Gemini model token              | `@nest-langchain/gemini @langchain/google-genai`                                      |
| AWS Bedrock model token         | `@nest-langchain/bedrock @langchain/aws`                                              |

Provider package는 의도적으로 Nest DI token을 노출하며 core를 요구하지 않습니다. `langgraph`, `tools`, `patterns`, `visualization`처럼 runnable을 발견하거나 등록하는 package는 core를 peer dependency로 사용합니다.

## Demo

```bash
pnpm install
pnpm --filter @nest-langchain/demo-basic start

curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```

## Package Boundary

- Core는 provider SDK를 import하지 않습니다.
- Core는 LangGraph 또는 LangSmith를 import하지 않습니다.
- Core는 registry behavior만 소유합니다.
- Optional package가 자기 runtime dependency와 Nest integration surface를 소유합니다.
