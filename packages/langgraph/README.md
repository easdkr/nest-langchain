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

```ts
import { Injectable } from '@nestjs/common';
import { LangGraphService } from '@nest-langchain/langgraph';

@Injectable()
export class AgentRunner {
  constructor(private readonly graphs: LangGraphService) {}

  run(input: unknown) {
    return this.graphs.invoke('support-agent', input, {
      configurable: {
        thread_id: 'thread-1',
      },
    });
  }
}
```

## Graph Patterns

`@nest-langchain/langgraph` exposes thin helpers around official LangGraph
execution primitives.

```ts
import { Injectable } from '@nestjs/common';
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
  entry: 'decide',
  finish: ['approvedPath', 'rejectedPath'],
  edges: [],
})
@Injectable()
export class SupportGraph {
  @GraphNode({
    ends: ['approvedPath', 'rejectedPath'],
  })
  decide(state: typeof SupportState.State) {
    return commandTo(state.approved ? 'approvedPath' : 'rejectedPath', {
      update: { output: 'routed' },
    });
  }

  @GraphNode()
  approvedPath(state: typeof SupportState.State) {
    return { output: `${state.output}:approved` };
  }

  @GraphNode()
  rejectedPath(state: typeof SupportState.State) {
    return { output: `${state.output}:rejected` };
  }
}
```

Available helpers:

- `commandTo(to, { update })`: update state and route with `Command`.
- `parentHandoff(to, { update })`: route from a subgraph to the closest parent graph with `Command.PARENT`.
- `CommandNode`, `RouteCommandNode`, `ParentHandoffNode`: decorator forms that wrap a method return value as command `update`.
- `sendTo(node, args)` and `fanOut(node, items, mapInput)`: `Send` helpers for router, map-reduce, and orchestrator-worker flows.
- `interruptFor(payload)` and `resumeWith(value)`: dynamic human-in-the-loop pause/resume helpers.
- `callSubgraph(subgraph, mapInput, mapOutput)`: wrapper for parent/subgraph state-schema transforms.

When returning `Command` from a node, set `@GraphNode({ ends: [...] })` for destinations inside the same graph and avoid also defining static edges from that node. LangGraph will run both static edges and command destinations if both are configured. Parent handoff destinations are parent-graph nodes, so `ParentHandoffNode` does not infer `ends` automatically.
