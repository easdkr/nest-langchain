# @nest-langchain/openai

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 OpenAI chat model provider입니다.

이 패키지는 `@langchain/openai`의 `ChatOpenAI` instance를 NestJS DI에 연결합니다. 연결정보(`apiKey`)는 module 레벨에 두고, `model`과 `temperature`는 프리셋 또는 호출 단위로 정합니다 — 라이브러리가 기본 model을 임의로 정하지 않습니다.

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
      apiKey: process.env.OPENAI_API_KEY, // 없으면 OPENAI_API_KEY 사용
      presets: [
        { name: 'fast', model: 'gpt-4.1-mini', temperature: 0 },
        { name: 'creative', model: 'gpt-4.1', temperature: 0.9 },
      ],
    }),
  ],
})
export class AiModule {}
```

`presets`를 생략하면 팩토리를 주입해 런타임에 모델을 생성합니다 (아래 참고).

## Injection

이름별 프리셋을 주입하거나, 팩토리를 주입해 호출마다 모델을 생성합니다. `model`은 항상 필수입니다:

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

동적 조회에는 `getOpenAIChatModelToken(name)`을 사용합니다.

## Async 연결정보

API key를 `ConfigService`나 secrets manager에서 받을 때는 `forRootAsync`를 사용합니다. 프리셋은 정적으로 유지됩니다 (토큰 이름이 정의 시점에 필요):

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

## 마이그레이션 (v0.1 → v0.2)

`NEST_LANGCHAIN_OPENAI_CHAT_MODEL`와 module 레벨 `model` / `temperature` 옵션은 **제거**됐습니다. `@Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)`를 이름별 프리셋(`@InjectOpenAIChatModel('default')` + `presets: [{ name: 'default', model: '...' }]`)으로 바꾸거나, `@InjectOpenAIChatModelFactory()`로 팩토리를 주입해 `.create({ model })`을 호출하세요.

## Demo

```bash
pnpm --filter @nest-langchain/demo-providers start
curl "http://localhost:3006/providers"

OPENAI_API_KEY=sk-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/openai/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about NestJS provider tokens."}'
```
