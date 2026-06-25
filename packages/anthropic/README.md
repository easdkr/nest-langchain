# @nest-langchain/anthropic

[English](README.md) | [한국어](README.ko.md)

Anthropic chat model provider for NestJS dependency injection.

This package creates a `ChatAnthropic` instance from `@langchain/anthropic` and
exports it through a stable Nest token.

## Install

```bash
pnpm add @nest-langchain/anthropic @langchain/anthropic
```

## Module

```ts
import { Module } from '@nestjs/common';
import { AnthropicProviderModule } from '@nest-langchain/anthropic';

@Module({
  imports: [
    AnthropicProviderModule.forRoot({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-haiku-4-5-20251001',
      temperature: 0,
    }),
  ],
})
export class AiModule {}
```

Environment fallbacks:

- `ANTHROPIC_API_KEY`
- `CLAUDE_API_KEY`
- `ANTHROPIC_BASE_URL` for compatible Anthropic endpoints

## Injection

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL } from '@nest-langchain/anthropic';

@Injectable()
export class ReviewService {
  constructor(
    @Inject(NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL)
    private readonly model: ChatAnthropic,
  ) {}

  async critique(input: string) {
    return this.model.invoke(input);
  }
}
```

## Demo

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/anthropic/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about critique models."}'
```
