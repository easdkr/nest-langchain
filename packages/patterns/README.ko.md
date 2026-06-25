# @nest-langchain/patterns

[English](README.md) | [한국어](README.ko.md)

Provider collaboration과 modern LangChain task pattern을 위한 NestJS decorator입니다.

이 패키지는 decorated task class를 발견하고 module startup에서 task graph를 검증하며 Nest DI token을 통해 provider role을 호출합니다. Provider SDK는 이 패키지 밖에 둡니다. `@nest-langchain/openai`, `@nest-langchain/anthropic`, `@nest-langchain/gemini`, `@nest-langchain/bedrock` 또는 custom provider의 token을 전달하세요.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core
```

`@DeepAgent`를 사용할 때만 Deep Agents를 설치합니다.

```bash
pnpm add deepagents
```

## Module

```ts
import { Module } from '@nestjs/common';
import { CollaborativePatternsModule } from '@nest-langchain/patterns';

@Module({
  imports: [
    CollaborativePatternsModule.forRoot({
      global: true,
    }),
  ],
  providers: [LaunchReviewTask],
})
export class AppModule {}
```

## Collaborative Task

```ts
import {
  CollaborativeTask,
  TaskExecutionContext,
  TaskStep,
} from '@nest-langchain/patterns';

@CollaborativeTask({
  name: 'launch-review',
  models: [
    { role: 'planner', token: OPENAI_MODEL },
    { role: 'critic', token: ANTHROPIC_MODEL },
    { role: 'judge', token: GEMINI_MODEL },
  ],
})
export class LaunchReviewTask {
  @TaskStep({
    name: 'drafts',
    pattern: 'parallel',
    models: ['planner', 'critic'],
  })
  drafts(input: { product: string }) {
    return `Draft a launch plan for ${input.product}.`;
  }

  @TaskStep({
    name: 'decision',
    pattern: 'structured',
    model: 'judge',
    dependsOn: ['drafts'],
  })
  decision(_input: unknown, context: TaskExecutionContext) {
    return `Decide from ${JSON.stringify(context.steps)}.`;
  }
}
```

Supported step patterns:

- `invoke`
- `parallel`
- `structured`
- `tool-call`
- `fallback`

Definition은 duplicate model role, duplicate step name, unknown dependency, unknown model role reference에서 fail fast합니다.

## Looking For LangGraph Command Pattern?

LangGraph execution-control pattern은 이 package가 아니라 `@nest-langchain/langgraph`에 있습니다. Command routing, parent handoff, `Send` fan-out, interrupt, resume, subgraph transform에는 `@nest-langchain/langgraph`의 `commandTo`, `@GraphNode({ ends })`, `CommandNode`, `RouteCommandNode`, `ParentHandoffNode`를 사용하세요.

## Deep Agents

```ts
import {
  DeepAgent,
  DeepAgentSubagent,
  DeepAgentTool,
} from '@nest-langchain/patterns';

@DeepAgent({
  name: 'market-research-agent',
  model: 'supervisor',
  models: [{ role: 'supervisor', token: OPENAI_MODEL }],
  systemPrompt: 'Plan, research, and write concise reports.',
  skills: ['/skills/research'],
  interruptOn: { write_file: true },
})
export class MarketResearchAgent {
  @DeepAgentTool({
    name: 'search_market',
    description: 'Search market notes.',
    schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  })
  searchMarket(input: { query: string }) {
    return `notes for ${input.query}`;
  }

  @DeepAgentSubagent({
    name: 'researcher',
    description: 'Runs isolated market research.',
    model: 'supervisor',
    systemPrompt: 'You are a focused market researcher.',
    tools: ['search_market'],
  })
  researcher() {
    return undefined;
  }
}
```

## Demo

```bash
pnpm --filter @nest-langchain/demo-patterns start

curl "http://localhost:3004/tasks"
curl -X POST "http://localhost:3004/tasks/launch-review" \
  -H "content-type: application/json" \
  -d '{"product":"Nest LangChain Patterns","market":"Korea B2B SaaS"}'
```
