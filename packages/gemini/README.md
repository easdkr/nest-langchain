# @nest-langchain/gemini

[English](README.md) | [한국어](README.ko.md)

Gemini chat model provider for NestJS dependency injection.

This package wires a `ChatGoogleGenerativeAI` instance from
`@langchain/google-genai` into NestJS dependency injection. Connection info
(`apiKey`) lives at the module level; `model` and `temperature` are chosen per
preset or per call via a factory — the library no longer picks a default model.

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
      presets: [
        { name: 'flash', model: 'gemini-2.5-flash', temperature: 0 },
        { name: 'pro', model: 'gemini-2.5-pro', temperature: 0.3 },
      ],
    }),
  ],
})
export class AiModule {}
```

When `apiKey` is omitted, the module reads `GOOGLE_API_KEY` and then
`GEMINI_API_KEY`.

## Injection

Inject a named preset, or inject the factory for per-call model creation. `model`
is always required — the library never assumes one:

```ts
import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  InjectGeminiChatModel,
  InjectGeminiChatModelFactory,
  GeminiChatModelFactory,
} from '@nest-langchain/gemini';

@Injectable()
export class JudgeService {
  constructor(
    @InjectGeminiChatModel('pro')
    private readonly model: ChatGoogleGenerativeAI,
    @InjectGeminiChatModelFactory()
    private readonly factory: GeminiChatModelFactory,
  ) {}

  decide(prompt: string) {
    return this.model.invoke(prompt);
  }

  decideWith(model: string, prompt: string) {
    return this.factory.create({ model }).invoke(prompt);
  }
}
```

For dynamic lookup use `getGeminiChatModelToken(name)`.

## Async Connection Info

Use `forRootAsync` when the API key comes from `ConfigService` or a secrets
manager. Presets stay static:

```ts
GeminiProviderModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('GEMINI_API_KEY'),
  }),
  presets: [{ name: 'flash', model: 'gemini-2.5-flash' }],
});
```

## Migration (v0.1 → v0.2)

`NEST_LANGCHAIN_GEMINI_CHAT_MODEL` and the module-level `model` /
`temperature` options were **removed**. Replace
`@Inject(NEST_LANGCHAIN_GEMINI_CHAT_MODEL)` with a named preset, or inject the
factory with `@InjectGeminiChatModelFactory()` and call `.create({ model })`.

## Demo

```bash
GEMINI_API_KEY=... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/gemini/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about judgement models."}'
```
