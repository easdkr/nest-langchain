# @nest-langchain/prompts

[English](README.md) | [한국어](README.ko.md)

LangChain prompt template를 위한 NestJS prompt registry입니다.

이 패키지는 named prompt definition을 저장하고, `@langchain/core/prompts`의 `PromptTemplate` instance를 만들며, Nest provider를 통해 formatting을 노출합니다.

## Install

```bash
pnpm add @nest-langchain/prompts @langchain/core
```

## Module

```ts
import { Module } from '@nestjs/common';
import { PromptsModule } from '@nest-langchain/prompts';

@Module({
  imports: [
    PromptsModule.forRoot({
      global: true,
      prompts: [
        {
          name: 'support.reply',
          template: 'Answer {customer} about {topic} in a {tone} tone.',
          inputVariables: ['customer', 'topic', 'tone'],
          metadata: {
            owner: 'support-platform',
          },
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Use Prompts

```ts
import { Injectable } from '@nestjs/common';
import { PromptRegistry } from '@nest-langchain/prompts';

@Injectable()
export class SupportPrompts {
  constructor(private readonly prompts: PromptRegistry) {}

  reply(customer: string, topic: string) {
    return this.prompts.format('support.reply', {
      customer,
      topic,
      tone: 'concise',
    });
  }
}
```

중복 prompt name은 registration 중에 fail fast합니다. 알 수 없는 prompt name은 read 또는 format 시 throw합니다.

## Demo

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start

curl "http://localhost:3005/prompts"
curl -X POST "http://localhost:3005/prompts/support-reply" \
  -H "content-type: application/json" \
  -d '{"customer":"Acme","topic":"checkout card failure","tone":"concise"}'
```

## Boundary

- `@langchain/core`의 prompt-template behavior를 소유합니다.
- `@nest-langchain/core`를 요구하지 않으며 standalone Nest registry입니다.
- Provider SDK, LangGraph, LangSmith에 의존하지 않습니다.
