# @nest-langchain/openai

[English](README.md) | [한국어](README.ko.md)

OpenAI chat model provider for NestJS dependency injection.

This package creates a `ChatOpenAI` instance from `@langchain/openai` and
exports it through a stable Nest token. Applications can inject the model
directly or pass the token to higher-level packages such as
`@nest-langchain/patterns`.

## Install

```bash
pnpm add @nest-langchain/openai @langchain/openai
```

## Module

```ts
import { Module } from '@nestjs/common';
import { OpenAIProviderModule } from '@nest-langchain/openai';

@Module({
  imports: [
    OpenAIProviderModule.forRoot({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4.1-mini',
      temperature: 0,
    }),
  ],
})
export class AiModule {}
```

When `apiKey` is omitted, the module reads `OPENAI_API_KEY`.

## Injection

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { NEST_LANGCHAIN_OPENAI_CHAT_MODEL } from '@nest-langchain/openai';

@Injectable()
export class SupportDraftService {
  constructor(
    @Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)
    private readonly model: ChatOpenAI,
  ) {}

  async draft(message: string) {
    return this.model.invoke(message);
  }
}
```

## Demo

```bash
pnpm --filter @nest-langchain/demo-providers start
curl "http://localhost:3006/providers"

OPENAI_API_KEY=sk-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/openai/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about NestJS provider tokens."}'
```
