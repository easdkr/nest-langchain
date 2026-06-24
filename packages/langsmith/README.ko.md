# @nest-langchain/langsmith

[English](README.md) | [한국어](README.ko.md)

NestJS를 위한 LangSmith runtime configuration과 trace decorator입니다.

이 패키지는 LangSmith environment setup, request metadata, input redaction, sampling, `@TraceableRun()` decorator를 한곳에 모읍니다. LangGraph와 함께 사용할 수 있지만 LangGraph가 필수는 아닙니다.

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

`LangSmithModule.forRoot()`의 기본값은 `enabled: false`입니다. Module을 추가해도 tracing이 실수로 켜지지 않습니다. 이 module은 Nest module initialization 중에만 environment variable을 적용합니다.

## Demo

```bash
pnpm --filter @nest-langchain/demo-langsmith start

curl -X POST "http://localhost:3000/trace" \
  -H "content-type: application/json" \
  -d '{"message":"Customer cannot complete checkout with saved card.","accountId":"acct_live_customer_42"}'
```

## Boundary

- `langsmith`를 소유합니다.
- Package family consistency를 위해 `@nest-langchain/core`를 peer로 둡니다.
- LangGraph 또는 provider SDK에 의존하지 않습니다.
