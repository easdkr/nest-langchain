# @nest-langchain/core

NestJS용 얇은 registry/core package입니다.

포함하는 것:

- `LangChainModule`
- `LangChainRegistry`
- runnable-like 계약
- generic provider scanner

포함하지 않는 것:

- LangGraph
- LangSmith
- OpenAI/Anthropic/Gemini 같은 provider SDK
- visualization renderer

## 설치

```bash
pnpm add @nest-langchain/core
```

Nest peer dependency는 소비 앱이 이미 가지고 있어야 합니다.

## 사용

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { LangChainModule, LangChainRegistry } from '@nest-langchain/core';

@Module({
  imports: [LangChainModule.forRoot({ global: true })],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit() {
    this.registry.registerRunnable('echo', {
      invoke: (input) => ({ input }),
    });
  }
}
```

LangGraph decorator가 필요하면 `@nest-langchain/langgraph`를, LangSmith tracing이 필요하면 `@nest-langchain/langsmith`를 별도로 설치합니다.
