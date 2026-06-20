# nest-langchain

NestJS 애플리케이션에서 LangChain, LangGraph, LangSmith를 일관된 모듈/데코레이터 방식으로 쓰기 위한 npm 패키지 골격입니다.

## 구성

- `packages/core`: Nest dynamic module, graph/node decorators, LangGraph 자동 discovery, registry, LangSmith 환경 설정 유틸리티
- `apps/demo`: 외부 LLM API 없이 바로 실행 가능한 NestJS 데모 앱
- `docs/design.md`: 패키지 책임, 런타임 흐름, 공개 API, 확장 계획

## 빠른 실행

```bash
cd nest-langchain
pnpm install
pnpm check
pnpm --filter @nest-langchain/demo start
```

데모 앱이 뜨면 아래 요청으로 decorator 기반 LangGraph 실행을 확인할 수 있습니다.

```bash
curl "http://localhost:3000/graphs"
curl "http://localhost:3000/graphs/joke?topic=NestJS&language=ko"
```

LangSmith 추적을 켜려면 `apps/demo/.env.example`을 참고해 환경변수를 설정한 뒤 실행하면 됩니다.

## 패키지 API 예시

```ts
import { Injectable } from '@nestjs/common';
import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/core';

const JokeState = Annotation.Root({
  topic: Annotation<string>(),
  answer: Annotation<string>(),
});

@LangGraph({
  name: 'joke',
  state: JokeState,
  entry: 'answer',
  finish: 'answer',
})
@Injectable()
export class JokeGraph {
  @GraphNode()
  answer(state: typeof JokeState.State) {
    return { answer: `${state.topic} is ready for a graph.` };
  }
}
```

Nest 모듈에는 `LangChainModule.forRoot()`만 추가하면 decorated graph provider가 bootstrap 시점에 registry에 등록됩니다.

