# @nest-langchain/langgraph

[English](README.md) | [한국어](README.ko.md)

LangGraph를 위한 NestJS decorator와 discovery package입니다.

이 패키지는 decorated Nest provider를 발견하고 LangGraph `StateGraph` instance를 compile한 뒤 `@nest-langchain/core`에 등록합니다. LangGraph runtime behavior는 core로 밀어 넣지 않고 이 패키지에 둡니다.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph
```

## Module

```ts
import { Module } from '@nestjs/common';
import { LangGraphModule } from '@nest-langchain/langgraph';

@Module({
  imports: [
    LangGraphModule.forRoot({
      global: true,
      checkpointer,
    }),
  ],
  providers: [SupportGraph],
})
export class AppModule {}
```

`checkpointer`는 LangGraph `compile({ checkpointer })`로 전달됩니다.

## Define A Graph

```ts
import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/langgraph';

const SupportState = Annotation.Root({
  message: Annotation<string>(),
  intent: Annotation<'billing' | 'technical' | 'general'>(),
  response: Annotation<string>(),
});

@LangGraph({
  name: 'support-intake',
  state: SupportState,
})
export class SupportGraph {
  @GraphNode({ entry: true })
  classifyRequest(state: typeof SupportState.State) {
    return {
      intent: state.message.includes('card') ? 'billing' : 'general',
    };
  }

  @GraphNode({ finish: true })
  draftResponse(state: typeof SupportState.State) {
    return {
      response: `Route ${state.intent} request to support.`,
    };
  }
}
```

Decorated graph class는 Nest provider입니다. Module `providers` array에 등록하세요.

## Execute Graphs

```ts
import { Injectable } from '@nestjs/common';
import { LangGraphRunner } from '@nest-langchain/langgraph';

@Injectable()
export class AgentRunner {
  constructor(private readonly graphs: LangGraphRunner) {}

  invoke(input: unknown) {
    return this.graphs.invoke('support-intake', input, {
      configurable: {
        thread_id: 'thread-1',
      },
    });
  }

  stream(input: unknown) {
    return this.graphs.stream('support-intake', input, {
      configurable: {
        thread_id: 'thread-1',
      },
    });
  }

  streamEvents(input: unknown) {
    return this.graphs.streamEvents(
      'support-intake',
      input,
      {
        configurable: {
          thread_id: 'thread-1',
        },
      },
      {
        version: 'v2',
      },
    );
  }
}
```

`invoke()`는 final graph result를 반환합니다. `stream()`과 `streamEvents()`는 async iterable을 반환합니다. NDJSON 또는 SSE 같은 HTTP framing은 application controller에 두는 것이 좋습니다.

## LangGraph Helpers

Helper는 official LangGraph primitive 위의 얇은 wrapper입니다.

### Command Pattern

Node가 state를 update하면서 다음 node도 같은 return value에서 골라야 할 때 Command Pattern을 사용합니다. `commandTo()`는 LangGraph `Command`를 반환하고, `@GraphNode({ ends })`는 가능한 dynamic destination을 선언하여 LangGraph가 graph를 검증할 수 있게 합니다.

```ts
import { Annotation } from '@langchain/langgraph';
import {
  commandTo,
  ConditionalEdge,
  fanOut,
  GraphNode,
  LangGraph,
  parentHandoff,
  resumeWith,
} from '@nest-langchain/langgraph';

const ReviewState = Annotation.Root({
  approved: Annotation<boolean>(),
  owner: Annotation<string>(),
  reviewAreas: Annotation<string[]>(),
});

@LangGraph({
  name: 'review',
  state: ReviewState,
})
export class ReviewGraph {
  @GraphNode({
    entry: true,
    ends: ['approvedPath', 'rejectedPath'],
  })
  decide(state: typeof ReviewState.State) {
    return commandTo(state.approved ? 'approvedPath' : 'rejectedPath', {
      update: { owner: 'reviewer' },
    });
  }

  @GraphNode()
  planReviews() {
    return {
      reviewAreas: ['legal', 'security'],
    };
  }

  @ConditionalEdge({ from: 'planReviews' })
  fanout(state: typeof ReviewState.State) {
    return fanOut('reviewWorker', state.reviewAreas, (area) => ({
      owner: area,
    }));
  }

  @GraphNode({ name: 'reviewWorker' })
  reviewWorker(state: typeof ReviewState.State) {
    return {
      owner: `${state.owner}:reviewed`,
    };
  }

  @GraphNode()
  handoffToParent() {
    return parentHandoff('parentNode', {
      update: { owner: 'parent' },
    });
  }

  @GraphNode()
  resume() {
    return resumeWith({ owner: 'human-review' });
  }
}
```

Decorator-first routing에서는 target graph가 명시적이면 `@CommandNode`, same-graph routing에는 `@RouteCommandNode`, subgraph가 parent graph로 control을 돌려줘야 하면 `@ParentHandoffNode`를 사용합니다. Decorated method가 이미 LangGraph `Command`를 반환하면 그대로 통과시키고, 아니면 method result를 command update로 감쌉니다.

```ts
import {
  CommandNode,
  ParentHandoffNode,
  RouteCommandNode,
} from '@nest-langchain/langgraph';

export class DecoratedRoutes {
  @CommandNode({
    name: 'remoteRoute',
    to: 'remoteNode',
    graph: 'remoteGraph',
  })
  remoteRoute() {
    return {
      output: 'remote',
    };
  }

  @RouteCommandNode({
    name: 'route',
    to: 'next',
  })
  route() {
    return {
      output: 'local',
    };
  }

  @ParentHandoffNode({
    name: 'escalate',
    to: 'supervisor',
  })
  escalate() {
    return {
      reason: 'needs-supervisor',
    };
  }
}
```

Parent handoff helper는 local `ends`를 자동 추론하지 않습니다. Parent destination은 LangGraph가 검증하는 child graph 밖에 있습니다.

`@nest-langchain/demo-langgraph`는 command routing, `Send` fan-out, interrupt/resume, explicit subgraph transform을 HTTP로 실행합니다.

## Demo

```bash
pnpm --filter @nest-langchain/demo-langgraph start

curl "http://localhost:3000/graphs"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a saved card error.","customerTier":"enterprise","channel":"web"}'
```

Hosted graph docs로 같은 registry surface를 보려면 `@nest-langchain/demo-visualization`을 사용하세요.

```bash
pnpm --filter @nest-langchain/demo-visualization start
open "http://localhost:3000/ai/graphs"
```

## Boundary

- `@langchain/langgraph`를 소유합니다.
- Compiled graph가 core registry에 등록되므로 `@nest-langchain/core`를 peer로 둡니다.
- LangSmith 또는 provider SDK에 의존하지 않습니다.
