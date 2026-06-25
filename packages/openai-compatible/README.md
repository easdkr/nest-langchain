# @nest-langchain/openai-compatible

[English](README.md) | [한국어](README.ko.md)

OpenAI-compatible Chat Completions provider for NestJS dependency injection.

Use this package for providers that expose an OpenAI-compatible API, including
MiniMax, Kimi/Moonshot, GLM/Z.AI, OpenRouter, Together, Fireworks, and internal
gateway endpoints.

## Install

```bash
pnpm add @nest-langchain/openai-compatible @langchain/openai
```

## Register Models

```ts
import { Module } from '@nestjs/common';
import { OpenAICompatibleProviderModule } from '@nest-langchain/openai-compatible';

@Module({
  imports: [
    OpenAICompatibleProviderModule.forRoot({
      models: [
        {
          name: 'minimax',
          apiKey: process.env.MINIMAX_API_KEY,
          baseURL: 'https://api.minimax.io/v1',
          model: 'MiniMax-M3',
          temperature: 1,
          modelKwargs: {
            reasoning_split: true,
          },
        },
        {
          name: 'kimi',
          apiKey: process.env.MOONSHOT_API_KEY,
          baseURL: 'https://api.moonshot.ai/v1',
          model: 'kimi-k2.7',
        },
        {
          name: 'glm',
          apiKey: process.env.ZAI_API_KEY,
          baseURL: 'https://api.z.ai/api/paas/v4',
          model: 'glm-5.2',
        },
      ],
    }),
  ],
})
export class AiModule {}
```

## Injection

```ts
import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { InjectOpenAICompatibleModel } from '@nest-langchain/openai-compatible';

@Injectable()
export class ProductWorkflow {
  constructor(
    @InjectOpenAICompatibleModel('minimax')
    private readonly model: ChatOpenAI,
  ) {}

  async run(prompt: string) {
    return this.model.invoke(prompt);
  }
}
```

`InjectOpenAICompatibleModel()` is a constructor-parameter helper. For dynamic
lookup, use `getOpenAICompatibleModelToken(name)`.

## Environment Fallbacks

For `name: 'minimax'`, the module checks both long and short env names:

```text
OPENAI_COMPATIBLE_MINIMAX_API_KEY
OPENAI_COMPATIBLE_MINIMAX_BASE_URL
OPENAI_COMPATIBLE_MINIMAX_MODEL

MINIMAX_API_KEY
MINIMAX_BASE_URL
MINIMAX_MODEL
```

The unnamed default model reads:

```text
OPENAI_COMPATIBLE_API_KEY
OPENAI_COMPATIBLE_BASE_URL
OPENAI_COMPATIBLE_MODEL
```

When a provider uses non-matching env names, bind them explicitly:

```ts
OpenAICompatibleProviderModule.forRoot({
  name: 'kimi',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  baseURLEnv: 'KIMI_BASE_URL',
  modelEnv: 'KIMI_MODEL',
});
```

## Client Options

- `configuration` is forwarded to the OpenAI client used by
  `@langchain/openai`.
- `baseURL` and `baseUrl` both work; the resolved value is written into
  `configuration.baseURL`.
- `defaultHeaders`, `timeout`, `maxRetries`, and `modelKwargs` are forwarded to
  `ChatOpenAI`.

## Demo

```bash
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=example-chat
pnpm --filter @nest-langchain/demo-providers start

curl -X POST "http://localhost:3006/providers/openai-compatible/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about compatible model endpoints."}'
```
