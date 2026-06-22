# @nest-langchain/langgraph

NestJS provider를 LangGraph `StateGraph`로 discovery/compile해서 `@nest-langchain/core` registry에 등록하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph
```

`@nest-langchain/core`는 LangGraph를 직접 의존하지 않습니다. LangGraph decorator와 compile 경로가 필요할 때만 이 패키지를 설치합니다.

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
})
export class AppModule {}
```

`checkpointer`는 LangGraph `compile({ checkpointer })`에 전달됩니다.

## Execution

Use `invoke()` when the caller only needs the final graph result. Use `stream()`
for graph state chunks, and `streamEvents()` when the caller needs LangGraph
event streams for progress UI, NDJSON, or SSE responses. LangSmith is not
required for any of these execution paths.

```ts
import { Injectable } from '@nestjs/common';
import { LangGraphRunner } from '@nest-langchain/langgraph';

@Injectable()
export class AgentRunner {
  constructor(private readonly graphs: LangGraphRunner) {}

  run(input: unknown) {
    return this.graphs.invoke('support-agent', input, {
      configurable: {
        thread_id: 'thread-1',
      },
    });
  }

  stream(input: unknown) {
    return this.graphs.stream('support-agent', input, {
      configurable: {
        thread_id: 'thread-1',
      },
    });
  }

  streamEvents(input: unknown) {
    return this.graphs.streamEvents(
      'support-agent',
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

Transport framing is application-owned. The package returns async iterables; a
Nest controller can adapt them to NDJSON or SSE without bypassing the registry.

### NDJSON

```ts
import { Body, Controller, Post, Res } from '@nestjs/common';
import { LangGraphRunner } from '@nest-langchain/langgraph';
import type { Response } from 'express';

interface WorkflowRequest {
  requestId: string;
  prompt: string;
}

@Controller()
export class WorkflowController {
  constructor(private readonly graphs: LangGraphRunner) {}

  @Post('workflow/stream')
  async streamWorkflow(@Body() body: WorkflowRequest, @Res() res: Response) {
    res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');

    const events = this.graphs.streamEvents(
      'detail-page-workflow',
      body,
      {
        configurable: {
          thread_id: body.requestId,
        },
      },
      {
        version: 'v2',
      },
    );

    for await (const event of events) {
      res.write(`${JSON.stringify(event)}\n`);
    }

    res.end();
  }
}
```

### SSE

```ts
import { Body, Controller, MessageEvent, Sse } from '@nestjs/common';
import { LangGraphRunner } from '@nest-langchain/langgraph';
import { Observable, map } from 'rxjs';

interface WorkflowRequest {
  requestId: string;
  prompt: string;
}

@Controller()
export class WorkflowController {
  constructor(private readonly graphs: LangGraphRunner) {}

  @Sse('workflow/events')
  streamWorkflowEvents(
    @Body() body: WorkflowRequest,
  ): Observable<MessageEvent> {
    return fromAsyncIterable(
      this.graphs.streamEvents(
        'detail-page-workflow',
        body,
        {
          configurable: {
            thread_id: body.requestId,
          },
        },
        {
          version: 'v2',
        },
      ),
    ).pipe(
      map((event) => ({
        type: 'workflow',
        data: event,
      })),
    );
  }
}

function fromAsyncIterable<T>(iterable: AsyncIterable<T>): Observable<T> {
  return new Observable<T>((subscriber) => {
    void (async () => {
      try {
        for await (const item of iterable) {
          subscriber.next(item);
        }

        subscriber.complete();
      } catch (error) {
        subscriber.error(error);
      }
    })();
  });
}
```

## Graph Patterns

`@nest-langchain/langgraph` exposes thin helpers around official LangGraph
execution primitives.

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

const SupportState = Annotation.Root({
  approved: Annotation<boolean>(),
  output: Annotation<string>(),
});

@LangGraph({
  name: 'support',
  state: SupportState,
  edges: [],
})
export class SupportGraph {
  @GraphNode({
    entry: true,
    ends: ['approvedPath', 'rejectedPath'],
  })
  decide(state: typeof SupportState.State) {
    return commandTo(state.approved ? 'approvedPath' : 'rejectedPath', {
      update: { output: 'routed' },
    });
  }

  @GraphNode({
    finish: true,
  })
  approvedPath(state: typeof SupportState.State) {
    return { output: `${state.output}:approved` };
  }

  @GraphNode({
    finish: true,
  })
  rejectedPath(state: typeof SupportState.State) {
    return { output: `${state.output}:rejected` };
  }
}
```

`@LangGraph()` also applies Nest `@Injectable()` metadata, so graph providers
do not need a separate `@Injectable()` decorator. The class still has to be
registered as a Nest provider in the consuming module.

Available helpers:

- `commandTo(to, { update })`: update state and route with `Command`.
- `parentHandoff(to, { update })`: route from a subgraph to the closest parent graph with `Command.PARENT`.
- `CommandNode`, `RouteCommandNode`, `ParentHandoffNode`: decorator forms that wrap a method return value as command `update`.
- `sendTo(node, args)` and `fanOut(node, items, mapInput)`: `Send` helpers for router, map-reduce, and orchestrator-worker flows.
- `interruptFor(payload)` and `resumeWith(value)`: dynamic human-in-the-loop pause/resume helpers.
- `callSubgraph(subgraph, mapInput, mapOutput)`: wrapper for parent/subgraph state-schema transforms.

When returning `Command` from a node, set `@GraphNode({ ends: [...] })` for destinations inside the same graph and avoid also defining static edges from that node. LangGraph will run both static edges and command destinations if both are configured. Parent handoff destinations are parent-graph nodes, so `ParentHandoffNode` does not infer `ends` automatically.

`entry` and `finish` can still be configured on `@LangGraph({ entry, finish })`
for compatibility, but node-local `@GraphNode({ entry: true, finish: true })`
is the preferred style because it survives method reordering and reduces
class-level string configuration.
