# @nest-langchain/prompts

NestJS prompt registry for LangChain prompt templates.

This package stores named prompt definitions, builds `PromptTemplate` instances
from `@langchain/core/prompts`, and exposes formatting through a Nest provider.

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

Duplicate prompt names fail fast during registration. Unknown prompt names throw
when read or formatted.

## Demo

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start

curl "http://localhost:3005/prompts"
curl -X POST "http://localhost:3005/prompts/support-reply" \
  -H "content-type: application/json" \
  -d '{"customer":"Acme","topic":"checkout card failure","tone":"concise"}'
```

## Boundary

- Owns prompt-template behavior from `@langchain/core`.
- Does not require `@nest-langchain/core`; prompts are a standalone Nest
  registry.
- Does not depend on provider SDKs, LangGraph, or LangSmith.
