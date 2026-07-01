# @nest-langchain/bedrock

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 AWS Bedrock chat model provider입니다.

이 패키지는 `@langchain/aws`의 `ChatBedrockConverse` instance를 NestJS DI에 연결합니다. 연결정보(`region`, 선택적 `credentials`)는 module 레벨에 두고, `model`과 `temperature`는 프리셋 또는 호출 단위로 정합니다 — 라이브러리가 기본 model을 임의로 정하지 않습니다.

## Install

```bash
pnpm add @nest-langchain/bedrock @langchain/aws
```

## Module

```ts
import { Module } from '@nestjs/common';
import { BedrockProviderModule } from '@nest-langchain/bedrock';

@Module({
  imports: [
    BedrockProviderModule.forRoot({
      region: process.env.AWS_REGION,
      presets: [
        {
          name: 'sonnet',
          model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          temperature: 0,
        },
        {
          name: 'haiku',
          model: 'anthropic.claude-3-5-haiku-20241022-v1:0',
          temperature: 0.2,
        },
      ],
    }),
  ],
})
export class AiModule {}
```

Region resolution order:

1. `region` option
2. `AWS_REGION`
3. `AWS_DEFAULT_REGION`
4. AWS config file의 active `AWS_PROFILE` region

Host app이 default AWS provider chain을 사용하지 않는다면 module 레벨에서 `credentials`를 전달하세요.

## Injection

이름별 프리셋을 주입하거나, 팩토리를 주입해 호출마다 모델을 생성합니다. `model`은 항상 필수입니다:

```ts
import { Injectable } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';
import {
  InjectBedrockChatModel,
  InjectBedrockChatModelFactory,
  BedrockChatModelFactory,
} from '@nest-langchain/bedrock';

@Injectable()
export class BedrockWorkflow {
  constructor(
    @InjectBedrockChatModel('sonnet')
    private readonly model: ChatBedrockConverse,
    @InjectBedrockChatModelFactory()
    private readonly factory: BedrockChatModelFactory,
  ) {}

  run(prompt: string) {
    return this.model.invoke(prompt);
  }

  runWith(model: string, prompt: string) {
    return this.factory.create({ model }).invoke(prompt);
  }
}
```

동적 조회에는 `getBedrockChatModelToken(name)`을 사용합니다.

## Async 연결정보

region이나 credentials를 `ConfigService`나 secrets manager에서 받을 때는 `forRootAsync`를 사용합니다. 프리셋은 정적으로 유지됩니다:

```ts
BedrockProviderModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    region: config.get('AWS_REGION'),
  }),
  presets: [
    { name: 'sonnet', model: 'anthropic.claude-3-5-sonnet-20240620-v1:0' },
  ],
});
```

## 마이그레이션 (v0.1 → v0.2)

`NEST_LANGCHAIN_BEDROCK_CHAT_MODEL`와 module 레벨 `model` / `temperature` 옵션은 **제거**됐습니다. `@Inject(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL)`를 이름별 프리셋으로 바꾸거나, `@InjectBedrockChatModelFactory()`로 팩토리를 주입해 `.create({ model })`을 호출하세요.

## Demo

```bash
AWS_REGION=us-east-1 pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/bedrock/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about Bedrock model routing."}'
```
