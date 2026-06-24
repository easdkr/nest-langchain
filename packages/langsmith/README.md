# @nest-langchain/langsmith

LangSmith runtime configuration and trace decorators for NestJS.

This package centralizes LangSmith environment setup, request metadata, input
redaction, sampling, and the `@TraceableRun()` decorator. It can be used beside
LangGraph, but LangGraph is not required.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith
```

## Module

```ts
import { Module } from '@nestjs/common';
import { LangSmithModule } from '@nest-langchain/langsmith';

@Module({
  imports: [
    LangSmithModule.forRoot({
      enabled: process.env.NODE_ENV === 'production',
      apiKey: process.env.LANGSMITH_API_KEY,
      project: 'support-agent',
      redactInputs: (inputs) => ({
        ...inputs,
        authorization: '[redacted]',
      }),
      requestMetadata: ({ metadata }) => ({
        tenantId: metadata.tenantId,
      }),
      sampling: ({ metadata }) => metadata.plan !== 'free',
    }),
  ],
})
export class AppModule {}
```

## Decorate Work

```ts
import { Injectable } from '@nestjs/common';
import { LangSmithContext, TraceableRun } from '@nest-langchain/langsmith';

@Injectable()
export class SupportHandler {
  handleRequest(tenantId: string, input: { message: string }) {
    return LangSmithContext.run({ tenantId }, () => this.reply(input));
  }

  @TraceableRun({ name: 'support.reply' })
  private reply(input: { message: string }) {
    return { answer: input.message };
  }
}
```

## Runtime Defaults

`LangSmithModule.forRoot()` defaults to `enabled: false`, so adding the module
does not turn tracing on by accident. The module applies environment variables
only during Nest module initialization.

## Demo

```bash
pnpm --filter @nest-langchain/demo-langsmith start

curl -X POST "http://localhost:3000/trace" \
  -H "content-type: application/json" \
  -d '{"message":"Customer cannot complete checkout with saved card.","accountId":"acct_live_customer_42"}'
```

## Boundary

- Owns `langsmith`.
- Peers against `@nest-langchain/core` for package-family consistency.
- Does not depend on LangGraph or provider SDKs.
