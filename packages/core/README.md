# @nest-langchain/core

NestJS에서 LangGraph workflow와 LangSmith tracing 설정을 module/decorator 방식으로 묶는 core package입니다.

## 설치

```bash
pnpm add @nest-langchain/core @langchain/core @langchain/langgraph langsmith
```

Nest peer dependency는 소비 앱이 이미 가지고 있어야 합니다.

## 사용

```ts
import { Module } from '@nestjs/common';
import { LangChainModule } from '@nest-langchain/core';

@Module({
  imports: [
    LangChainModule.forRoot({
      global: true,
      langSmith: {
        enabled: process.env.LANGSMITH_TRACING === 'true',
        apiKey: process.env.LANGSMITH_API_KEY,
        project: process.env.LANGSMITH_PROJECT,
      },
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from '@nestjs/common';
import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/core';

const State = Annotation.Root({
  input: Annotation<string>(),
  output: Annotation<string>(),
});

@LangGraph({
  name: 'hello',
  state: State,
  entry: 'answer',
  finish: 'answer',
})
@Injectable()
export class HelloGraph {
  @GraphNode()
  answer(state: typeof State.State) {
    return { output: `hello ${state.input}` };
  }
}
```

