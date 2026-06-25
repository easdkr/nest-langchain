# @nest-langchain/openai

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 OpenAI chat model provider입니다.

이 패키지는 `@langchain/openai`의 `ChatOpenAI` instance를 만들고 안정적인 Nest token으로 export합니다. Application은 model을 직접 inject하거나 `@nest-langchain/patterns` 같은 상위 패키지에 token을 전달할 수 있습니다.

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

`apiKey`가 없으면 module은 `OPENAI_API_KEY`를 읽습니다.

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
