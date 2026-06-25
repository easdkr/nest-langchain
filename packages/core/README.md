# @nest-langchain/core

[English](README.md) | [한국어](README.ko.md)

Use `@nest-langchain/core` when your Nest app needs a shared place to register
and call runnables by name.

## Install

```bash
pnpm add @nest-langchain/core
```

Install the Nest peer dependencies in your app if they are not already present:

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

## Register Your Runnable

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

Start with `invoke()`. Add `stream()` or `streamEvents()` only when the runnable
needs streaming.

## Add More Features

Install another package when you want to add a specific LangChain feature.

| When You Want To                | Install                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| build LangGraph workflows       | `@nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph` |
| trace runs with LangSmith       | `@nest-langchain/core @nest-langchain/langsmith langsmith`                            |
| expose Nest methods as tools    | `@nest-langchain/core @nest-langchain/tools @langchain/core zod`                      |
| manage prompt templates         | `@nest-langchain/prompts @langchain/core`                                             |
| run collaborative task patterns | `@nest-langchain/core @nest-langchain/patterns @langchain/core`                       |
| serve graph documentation       | `@nest-langchain/core @nest-langchain/visualization`                                  |
| inject an OpenAI model          | `@nest-langchain/openai @langchain/openai`                                            |
| inject OpenAI-compatible models | `@nest-langchain/openai-compatible @langchain/openai`                                 |
| inject an Anthropic model       | `@nest-langchain/anthropic @langchain/anthropic`                                      |
| inject a Gemini model           | `@nest-langchain/gemini @langchain/google-genai`                                      |
| inject an AWS Bedrock model     | `@nest-langchain/bedrock @langchain/aws`                                              |

## Demo

```bash
pnpm install
pnpm --filter @nest-langchain/demo-basic start

curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```
