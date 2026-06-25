# @nest-langchain/bedrock

[English](README.md) | [한국어](README.ko.md)

NestJS dependency injection을 위한 AWS Bedrock chat model provider입니다.

이 패키지는 `@langchain/aws`의 `ChatBedrockConverse` instance를 만들고 안정적인 Nest token으로 export합니다.

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
      model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      temperature: 0,
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

Host app이 default AWS provider chain을 사용하지 않는다면 `credentials`를 전달하세요.

## Injection

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';
import { NEST_LANGCHAIN_BEDROCK_CHAT_MODEL } from '@nest-langchain/bedrock';

@Injectable()
export class BedrockWorkflow {
  constructor(
    @Inject(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL)
    private readonly model: ChatBedrockConverse,
  ) {}

  async run(prompt: string) {
    return this.model.invoke(prompt);
  }
}
```

## Demo

```bash
AWS_REGION=us-east-1 pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/bedrock/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about Bedrock model routing."}'
```
