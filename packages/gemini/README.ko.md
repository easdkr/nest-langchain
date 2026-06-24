# @nest-langchain/gemini

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 Gemini chat model provider입니다.

이 패키지는 `@langchain/google-genai`의 `ChatGoogleGenerativeAI` instance를 만들고 안정적인 Nest token으로 export합니다.

## Install

```bash
pnpm add @nest-langchain/gemini @langchain/google-genai
```

## Module

```ts
import { Module } from '@nestjs/common';
import { GeminiProviderModule } from '@nest-langchain/gemini';

@Module({
  imports: [
    GeminiProviderModule.forRoot({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0,
    }),
  ],
})
export class AiModule {}
```

`apiKey`가 없으면 module은 `GOOGLE_API_KEY`를 먼저 읽고 그다음 `GEMINI_API_KEY`를 읽습니다.

## Injection

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NEST_LANGCHAIN_GEMINI_CHAT_MODEL } from '@nest-langchain/gemini';

@Injectable()
export class JudgeService {
  constructor(
    @Inject(NEST_LANGCHAIN_GEMINI_CHAT_MODEL)
    private readonly model: ChatGoogleGenerativeAI,
  ) {}

  async decide(prompt: string) {
    return this.model.invoke(prompt);
  }
}
```

## Demo

```bash
GEMINI_API_KEY=... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/gemini/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about judgement models."}'
```

## Boundary

- `@langchain/google-genai`를 소유합니다.
- `@nest-langchain/core`, LangGraph, LangSmith에 의존하지 않습니다.
- 직접 injection 또는 task-pattern 사용을 위해 model을 Nest DI token으로 노출합니다.
