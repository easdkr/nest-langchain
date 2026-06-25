# @nest-langchain/patterns

[English](README.md) | [한국어](README.ko.md)

NestJS decorators for provider collaboration and modern LangChain task
patterns.

This package discovers decorated task classes, validates task graphs at module
startup, and invokes provider roles through Nest DI tokens. Provider SDKs stay
outside this package; pass tokens from `@nest-langchain/openai`,
`@nest-langchain/anthropic`, `@nest-langchain/gemini`,
`@nest-langchain/bedrock`, or custom providers.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core
```

Install Deep Agents only when using `@DeepAgent`:

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

Definitions fail fast on duplicate model roles, duplicate step names, unknown
dependencies, and unknown model role references.

## Looking For LangGraph Command Pattern?

LangGraph execution-control patterns live in `@nest-langchain/langgraph`, not in
this package. Use `commandTo`, `@GraphNode({ ends })`, `CommandNode`,
`RouteCommandNode`, and `ParentHandoffNode` from `@nest-langchain/langgraph` for
Command routing, parent handoff, `Send` fan-out, interrupts, resume, and
subgraph transforms.

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
