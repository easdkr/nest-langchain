# @nest-langchain/anthropic

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 Anthropic chat model provider입니다.

이 패키지는 `@langchain/anthropic`의 `ChatAnthropic` instance를 NestJS DI에 연결합니다. 연결정보(`apiKey`, 선택적 `anthropicApiUrl`)는 module 레벨에 두고, `model`과 `temperature`는 프리셋 또는 호출 단위로 정합니다 — 라이브러리가 기본 model을 임의로 정하지 않습니다.

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

`apiKey` 환경변수 fallback: `ANTHROPIC_API_KEY`, `CLAUDE_API_KEY`. `ANTHROPIC_BASE_URL`(또는 `baseUrl` / `anthropicApiUrl` 옵션)로 compatible endpoint를 지정합니다.

## Injection

이름별 프리셋을 주입하거나, 팩토리를 주입해 호출마다 모델을 생성합니다. `model`은 항상 필수입니다:

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

동적 조회에는 `getAnthropicChatModelToken(name)`을 사용합니다.

## Async 연결정보

API key를 `ConfigService`나 secrets manager에서 받을 때는 `forRootAsync`를 사용합니다. 프리셋은 정적으로 유지됩니다:

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

## 마이그레이션 (v0.1 → v0.2)

`NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL`와 module 레벨 `model` / `temperature` 옵션은 **제거**됐습니다. `@Inject(NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL)`를 이름별 프리셋으로 바꾸거나, `@InjectAnthropicChatModelFactory()`로 팩토리를 주입해 `.create({ model })`을 호출하세요.

## Demo

```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/anthropic/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about critique models."}'
```
