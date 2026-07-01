# @nest-langchain/anthropic

[English](README.md) | [한국어](README.ko.md)

Anthropic chat model provider for NestJS dependency injection.

This package wires a `ChatAnthropic` instance from `@langchain/anthropic` into
NestJS dependency injection. Connection info (`apiKey`, optional
`anthropicApiUrl`) lives at the module level; `model` and `temperature` are
chosen per preset or per call via a factory — the library no longer picks a
default model.

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
      presets: [
        { name: 'haiku', model: 'claude-haiku-4-5-20251001', temperature: 0 },
        { name: 'sonnet', model: 'claude-sonnet-4-5', temperature: 0.4 },
      ],
    }),
  ],
})
export class AiModule {}
```

Environment fallbacks for `apiKey`: `ANTHROPIC_API_KEY`, `CLAUDE_API_KEY`.
`ANTHROPIC_BASE_URL` (or the `baseUrl` / `anthropicApiUrl` option) sets a
compatible endpoint.

## Injection

Inject a named preset, or inject the factory for per-call model creation. `model`
is always required — the library never assumes one:

```ts
import { Injectable } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import {
  InjectAnthropicChatModel,
  InjectAnthropicChatModelFactory,
  AnthropicChatModelFactory,
} from '@nest-langchain/anthropic';

@Injectable()
export class ReviewService {
  constructor(
    @InjectAnthropicChatModel('sonnet') private readonly model: ChatAnthropic,
    @InjectAnthropicChatModelFactory()
    private readonly factory: AnthropicChatModelFactory,
  ) {}

  critique(input: string) {
    return this.model.invoke(input);
  }

  critiqueWith(model: string, input: string) {
    return this.factory.create({ model }).invoke(input);
  }
}
```

For dynamic lookup use `getAnthropicChatModelToken(name)`.

## Async Connection Info

Use `forRootAsync` when the API key comes from `ConfigService` or a secrets
manager. Presets stay static:

```ts
AnthropicProviderModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('ANTHROPIC_API_KEY'),
  }),
  presets: [{ name: 'haiku', model: 'claude-haiku-4-5-20251001' }],
});
```

## Migration (v0.1 → v0.2)

`NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL` and the module-level `model` /
`temperature` options were **removed**. Replace
`@Inject(NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL)` with a named preset, or inject
the factory with `@InjectAnthropicChatModelFactory()` and call `.create({ model })`.

## Demo

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/anthropic/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about critique models."}'
```
