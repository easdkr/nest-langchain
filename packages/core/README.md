# @nest-langchain/core

Thin NestJS registry and shared contracts for optional LangChain ecosystem
packages.

`@nest-langchain/core` owns only the Nest module, runnable registry, structural
runnable contracts, and decorated-provider scanner. It deliberately does not
depend on LangGraph, LangSmith, provider SDKs, prompt templates, tools, or the
visualization renderer.

## Install

```bash
pnpm add @nest-langchain/core
```

Peer dependencies are expected to come from the host Nest application:

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

`invoke()` is the only required method. `stream()` and `streamEvents()` are
optional structural methods, so integration packages can expose streaming
without forcing core to import LangChain runtime types.

## Optional Packages

Core stays thin; install the package that owns the feature you need.

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

Provider packages intentionally expose Nest DI tokens and do not require core.
Packages that discover or register runnables, such as `langgraph`, `tools`,
`patterns`, and `visualization`, peer against core.

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

- Core does not import provider SDKs.
- Core does not import LangGraph or LangSmith.
- Core owns registry behavior only.
- Optional packages own their runtime dependencies and Nest integration surface.
