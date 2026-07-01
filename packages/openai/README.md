# @nest-langchain/openai

[English](README.md) | [한국어](README.ko.md)

OpenAI chat model provider for NestJS dependency injection.

This package wires a `ChatOpenAI` instance from `@langchain/openai` into NestJS
dependency injection. Connection info (`apiKey`) lives at the module level; the
`model` and `temperature` are chosen per preset or per call via a factory — the
library no longer picks a default model.

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
      apiKey: process.env.OPENAI_API_KEY, // falls back to OPENAI_API_KEY
      presets: [
        { name: 'fast', model: 'gpt-4.1-mini', temperature: 0 },
        { name: 'creative', model: 'gpt-4.1', temperature: 0.9 },
      ],
    }),
  ],
})
export class AiModule {}
```

Omit `presets` to inject the factory and build models at runtime (see below).

## Injection

Inject a named preset, or inject the factory for per-call model creation. `model`
is always required — the library never assumes one:

```ts
import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  InjectOpenAIChatModel,
  InjectOpenAIChatModelFactory,
  OpenAIChatModelFactory,
} from '@nest-langchain/openai';

@Injectable()
export class SupportDraftService {
  constructor(
    @InjectOpenAIChatModel('fast') private readonly model: ChatOpenAI,
    @InjectOpenAIChatModelFactory()
    private readonly factory: OpenAIChatModelFactory,
  ) {}

  draft(message: string) {
    return this.model.invoke(message);
  }

  draftWith(model: string, message: string) {
    return this.factory.create({ model }).invoke(message);
  }
}
```

For dynamic lookup use `getOpenAIChatModelToken(name)`.

## Async Connection Info

Use `forRootAsync` when the API key comes from `ConfigService` or a secrets
manager. Presets stay static (token names are fixed at definition time):

```ts
OpenAIProviderModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('OPENAI_API_KEY'),
  }),
  presets: [{ name: 'fast', model: 'gpt-4.1-mini' }],
});
```

## Migration (v0.1 → v0.2)

`NEST_LANGCHAIN_OPENAI_CHAT_MODEL` and the module-level `model` / `temperature`
options were **removed**. Replace `@Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)`
with a named preset (`@InjectOpenAIChatModel('default')` +
`presets: [{ name: 'default', model: '...' }]`), or inject the factory with
`@InjectOpenAIChatModelFactory()` and call `.create({ model })`.

## Demo

```bash
pnpm --filter @nest-langchain/demo-providers start
curl "http://localhost:3006/providers"

OPENAI_API_KEY=sk-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/openai/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about NestJS provider tokens."}'
```
