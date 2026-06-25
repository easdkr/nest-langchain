# @nest-langchain/gemini

[English](README.md) | [한국어](README.ko.md)

Gemini chat model provider for NestJS dependency injection.

This package creates a `ChatGoogleGenerativeAI` instance from
`@langchain/google-genai` and exports it through a stable Nest token.

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

When `apiKey` is omitted, the module reads `GOOGLE_API_KEY` and then
`GEMINI_API_KEY`.

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
