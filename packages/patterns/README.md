# @nest-langchain/patterns

Provider collaboration decorators for modern LangChain task patterns.

```bash
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core
```

This package does not own provider SDKs. Pass provider-specific Nest tokens from
`@nest-langchain/openai`, `@nest-langchain/anthropic`, `@nest-langchain/gemini`,
or `@nest-langchain/bedrock` into `@CollaborativeTask`.

Install Deep Agents only when using `@DeepAgent`.

```bash
pnpm add deepagents
```

## Collaborative Tasks

```ts
@CollaborativeTask({
  name: "launch-review",
  models: [
    { role: "planner", token: OPENAI_MODEL },
    { role: "critic", token: ANTHROPIC_MODEL },
    { role: "judge", token: GEMINI_MODEL },
  ],
})
@Injectable()
export class LaunchReviewTask {
  @TaskStep({
    name: "drafts",
    pattern: "parallel",
    models: ["planner", "critic"],
  })
  drafts(input: { product: string }) {
    return `Draft a launch plan for ${input.product}.`;
  }

  @TaskStep({
    name: "decision",
    pattern: "structured",
    model: "judge",
    dependsOn: ["drafts"],
  })
  decision(input: unknown, context: TaskExecutionContext) {
    return `Decide from ${JSON.stringify(context.steps)}.`;
  }
}
```

Supported `@TaskStep` patterns:

- `invoke`: single model call
- `parallel`: fan out to multiple provider roles
- `structured`: call `withStructuredOutput`
- `tool-call`: call `bindTools`
- `fallback`: try provider roles in order

## Deep Agents

```ts
@DeepAgent({
  name: "market-research-agent",
  model: "supervisor",
  models: [{ role: "supervisor", token: OPENAI_MODEL }],
  systemPrompt: "Plan, research, and write concise reports.",
  skills: ["/skills/research"],
  interruptOn: { write_file: true },
})
@Injectable()
export class MarketResearchAgent {
  @DeepAgentTool({
    name: "search_market",
    description: "Search market notes.",
    schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  })
  searchMarket(input: { query: string }) {
    return `notes for ${input.query}`;
  }

  @DeepAgentSubagent({
    name: "researcher",
    description: "Runs isolated market research.",
    model: "supervisor",
    systemPrompt: "You are a focused market researcher.",
    tools: ["search_market"],
  })
  researcher() {
    return undefined;
  }
}
```
