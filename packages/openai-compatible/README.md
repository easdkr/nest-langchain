# @nest-langchain/openai-compatible

OpenAI-compatible Chat Completions providers를 Nest DI token으로 노출하는 선택 패키지입니다.

MiniMax, Kimi/Moonshot, GLM/Z.AI, OpenRouter, Together, Fireworks처럼 OpenAI Chat Completions 호환 endpoint를 제공하는 모델을 같은 방식으로 주입할 수 있습니다.

```bash
pnpm add @nest-langchain/openai-compatible @langchain/openai
```

`@nest-langchain/core`와 `@nest-langchain/langgraph`는 provider SDK를 직접 의존하지 않습니다.

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

GLM Coding Plan처럼 provider가 별도 coding endpoint를 요구하는 경우에는 해당 endpoint를 `baseURL`에 넣습니다.

## Constructor Injection

모델은 Nest DI provider로 등록됩니다. 소비 코드는 생성자 주입을 사용합니다.

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

`InjectOpenAICompatibleModel()`은 생성자 파라미터용 helper입니다. property injection 예시는 제공하지 않습니다.

## Environment Fallbacks

명시 옵션이 없으면 이름 기반 환경 변수를 읽습니다.

For `name: 'minimax'`:

```text
OPENAI_COMPATIBLE_MINIMAX_API_KEY
OPENAI_COMPATIBLE_MINIMAX_BASE_URL
OPENAI_COMPATIBLE_MINIMAX_MODEL
```

또는 짧은 provider prefix도 읽습니다.

```text
MINIMAX_API_KEY
MINIMAX_BASE_URL
MINIMAX_MODEL
```

기본 unnamed model은 다음 env를 읽습니다.

```text
OPENAI_COMPATIBLE_API_KEY
OPENAI_COMPATIBLE_BASE_URL
OPENAI_COMPATIBLE_MODEL
```

Kimi처럼 API key env 이름이 provider 이름과 다르면 명시할 수 있습니다.

```ts
OpenAICompatibleProviderModule.forRoot({
  name: 'kimi',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  baseURLEnv: 'KIMI_BASE_URL',
  modelEnv: 'KIMI_MODEL',
});
```

## Provider-Specific Parameters

OpenAI-compatible providers sometimes expose extra Chat Completions parameters. Pass those through `modelKwargs`.

```ts
OpenAICompatibleProviderModule.forRoot({
  name: 'minimax',
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: 'https://api.minimax.io/v1',
  model: 'MiniMax-M3',
  modelKwargs: {
    reasoning_split: true,
  },
});
```

`configuration` is forwarded to the underlying OpenAI client used by `@langchain/openai`, with `baseURL` set from the module options.
