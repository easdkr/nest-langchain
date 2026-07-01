# @nest-langchain/bedrock

[English](README.md) | [한국어](README.ko.md)

AWS Bedrock chat model provider for NestJS dependency injection.

This package wires a `ChatBedrockConverse` instance from `@langchain/aws` into
NestJS dependency injection. Connection info (`region`, optional `credentials`)
lives at the module level; `model` and `temperature` are chosen per preset or
per call via a factory — the library no longer picks a default model.

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
4. active `AWS_PROFILE` region from the AWS config file

Pass `credentials` at the module level when the host app does not use the
default AWS provider chain.

## Injection

Inject a named preset, or inject the factory for per-call model creation. `model`
is always required — the library never assumes one:

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

For dynamic lookup use `getBedrockChatModelToken(name)`.

## Async Connection Info

Use `forRootAsync` when the region or credentials come from `ConfigService` or a
secrets manager. Presets stay static:

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

## Migration (v0.1 → v0.2)

`NEST_LANGCHAIN_BEDROCK_CHAT_MODEL` and the module-level `model` /
`temperature` options were **removed**. Replace
`@Inject(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL)` with a named preset, or inject the
factory with `@InjectBedrockChatModelFactory()` and call `.create({ model })`.

## Demo

```bash
AWS_REGION=us-east-1 pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/bedrock/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about Bedrock model routing."}'
```
