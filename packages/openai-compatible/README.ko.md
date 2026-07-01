# @nest-langchain/openai-compatible

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 OpenAI-compatible Chat Completions provider입니다.

MiniMax, Kimi/Moonshot, GLM/Z.AI, OpenRouter, Together, Fireworks, internal gateway처럼 OpenAI-compatible API를 제공하는 provider에 사용합니다.

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

`InjectOpenAICompatibleModel()`은 constructor parameter helper입니다. Dynamic lookup에는 `getOpenAICompatibleModelToken(name)`을 사용합니다.

## Runtime Factory

각 이름별 엔트리는 팩토리도 노출합니다. 팩토리를 주입하면 엔트리의 연결정보와 기본값(`temperature`, `modelKwargs`, `timeout`, `maxRetries`)을 상속하면서 호출마다 model id / 오버라이드를 바꿔 모델을 생성할 수 있습니다:

```ts
import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  InjectOpenAICompatibleModelFactory,
  OpenAICompatibleChatModelFactory,
} from '@nest-langchain/openai-compatible';

@Injectable()
export class ProductWorkflow {
  constructor(
    @InjectOpenAICompatibleModelFactory('minimax')
    private readonly factory: OpenAICompatibleChatModelFactory,
  ) {}

  run(model: string, prompt: string) {
    return this.factory.create({ model, temperature: 0.5 }).invoke(prompt);
  }
}
```

Dynamic lookup에는 `getOpenAICompatibleModelFactoryToken(name)`을 사용합니다. `create()`에는 `model`이 필수입니다.

## Environment Fallbacks

`name: 'minimax'`에서는 긴 env name과 짧은 env name을 모두 확인합니다.

```text
OPENAI_COMPATIBLE_MINIMAX_API_KEY
OPENAI_COMPATIBLE_MINIMAX_BASE_URL
OPENAI_COMPATIBLE_MINIMAX_MODEL

MINIMAX_API_KEY
MINIMAX_BASE_URL
MINIMAX_MODEL
```

이름 없는 default model은 다음 값을 읽습니다.

```text
OPENAI_COMPATIBLE_API_KEY
OPENAI_COMPATIBLE_BASE_URL
OPENAI_COMPATIBLE_MODEL
```

Provider가 다른 env name을 사용한다면 명시적으로 binding합니다.

```ts
OpenAICompatibleProviderModule.forRoot({
  name: 'kimi',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  baseURLEnv: 'KIMI_BASE_URL',
  modelEnv: 'KIMI_MODEL',
});
```

## Client Options

- `configuration`은 `@langchain/openai`가 사용하는 OpenAI client로 전달됩니다.
- `baseURL`과 `baseUrl` 모두 동작하며, resolved value는 `configuration.baseURL`에 기록됩니다.
- `defaultHeaders`, `timeout`, `maxRetries`, `modelKwargs`는 `ChatOpenAI`로 전달됩니다.

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
