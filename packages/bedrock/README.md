# @nest-langchain/bedrock

AWS Bedrock chat model provider for NestJS dependency injection.

This package creates a `ChatBedrockConverse` instance from `@langchain/aws` and
exports it through a stable Nest token.

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
4. active `AWS_PROFILE` region from the AWS config file

Pass `credentials` when the host app does not use the default AWS provider
chain.

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

## Boundary

- Owns `@langchain/aws`.
- Does not depend on `@nest-langchain/core`, LangGraph, or LangSmith.
- Exposes the model as a Nest DI token for direct injection or task-pattern use.
