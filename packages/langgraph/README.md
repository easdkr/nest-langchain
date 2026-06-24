# @nest-langchain/langgraph

NestJS decorators and discovery for LangGraph.

This package discovers decorated Nest providers, compiles LangGraph
`StateGraph` instances, and registers them in `@nest-langchain/core`. It keeps
LangGraph runtime behavior in this package instead of pushing it into core.

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

`checkpointer` is passed to LangGraph `compile({ checkpointer })`.

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

Decorated graph classes are Nest providers. Register them in the module
`providers` array.

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

`invoke()` returns the final graph result. `stream()` and `streamEvents()` return
async iterables; HTTP framing such as NDJSON and SSE should stay in the
application controller.

## LangGraph Helpers

The helpers are thin wrappers around official LangGraph primitives.

```ts
import { Annotation } from '@langchain/langgraph';
import {
  commandTo,
  fanOut,
  GraphNode,
  LangGraph,
  parentHandoff,
  resumeWith,
  sendTo,
} from '@nest-langchain/langgraph';

const ReviewState = Annotation.Root({
  approved: Annotation<boolean>(),
  owner: Annotation<string>(),
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
  fanout() {
    return fanOut([
      sendTo('legalReview', { owner: 'legal' }),
      sendTo('securityReview', { owner: 'security' }),
    ]);
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

Parent handoff helpers do not auto-infer local `ends`; parent destinations live
outside the child graph that LangGraph validates.

## Demo

```bash
pnpm --filter @nest-langchain/demo-langgraph start

curl "http://localhost:3000/graphs"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a saved card error.","customerTier":"enterprise","channel":"web"}'
```

Use `@nest-langchain/demo-visualization` to inspect the same registry surface
through hosted graph docs:

```bash
pnpm --filter @nest-langchain/demo-visualization start
open "http://localhost:3000/ai/graphs"
```

## Boundary

- Owns `@langchain/langgraph`.
- Peers against `@nest-langchain/core` because compiled graphs are registered in
  the core registry.
- Does not depend on LangSmith or provider SDKs.
