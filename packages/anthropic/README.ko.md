# @nest-langchain/anthropic

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 Anthropic chat model provider입니다.

이 패키지는 `@langchain/anthropic`의 `ChatAnthropic` instance를 만들고 안정적인 Nest token으로 export합니다.

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

Environment fallback:

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

## Boundary

- `@langchain/anthropic`를 소유합니다.
- `@nest-langchain/core`, LangGraph, LangSmith에 의존하지 않습니다.
- 직접 injection 또는 task-pattern 사용을 위해 model을 Nest DI token으로 노출합니다.
