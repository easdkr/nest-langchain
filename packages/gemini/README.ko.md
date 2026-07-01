# @nest-langchain/gemini

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 Gemini chat model provider입니다.

이 패키지는 `@langchain/google-genai`의 `ChatGoogleGenerativeAI` instance를 NestJS DI에 연결합니다. 연결정보(`apiKey`)는 module 레벨에 두고, `model`과 `temperature`는 프리셋 또는 호출 단위로 정합니다 — 라이브러리가 기본 model을 임의로 정하지 않습니다.

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

`apiKey`가 없으면 module은 `GOOGLE_API_KEY`를 먼저 읽고 그다음 `GEMINI_API_KEY`를 읽습니다.

## Injection

이름별 프리셋을 주입하거나, 팩토리를 주입해 호출마다 모델을 생성합니다. `model`은 항상 필수입니다:

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

동적 조회에는 `getGeminiChatModelToken(name)`을 사용합니다.

## Async 연결정보

API key를 `ConfigService`나 secrets manager에서 받을 때는 `forRootAsync`를 사용합니다. 프리셋은 정적으로 유지됩니다:

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

## 마이그레이션 (v0.1 → v0.2)

`NEST_LANGCHAIN_GEMINI_CHAT_MODEL`와 module 레벨 `model` / `temperature` 옵션은 **제거**됐습니다. `@Inject(NEST_LANGCHAIN_GEMINI_CHAT_MODEL)`를 이름별 프리셋으로 바꾸거나, `@InjectGeminiChatModelFactory()`로 팩토리를 주입해 `.create({ model })`을 호출하세요.

## Demo

```bash
GEMINI_API_KEY=... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/gemini/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about judgement models."}'
```
