# @nest-langchain/langsmith

LangSmith tracing 설정과 `@TraceableRun` decorator를 제공하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith
```

`@nest-langchain/core`는 LangSmith를 직접 의존하지 않습니다.

```ts
import { Module } from '@nestjs/common';
import { LangSmithModule } from '@nest-langchain/langsmith';

@Module({
  imports: [
    LangSmithModule.forRoot({
      enabled: process.env.NODE_ENV === 'production',
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

```ts
import { Injectable } from '@nestjs/common';
import { LangSmithContext, TraceableRun } from '@nest-langchain/langsmith';

@Injectable()
export class SupportService {
  handleRequest(tenantId: string, input: { message: string }) {
    return LangSmithContext.run({ tenantId }, () => this.reply(input));
  }

  @TraceableRun({ name: 'support.reply' })
  private reply(input: { message: string }) {
    return { answer: input.message };
  }
}
```
