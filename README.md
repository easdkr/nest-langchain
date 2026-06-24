# nest-langchain

Production-oriented NestJS integrations for the LangChain ecosystem.

The package family is intentionally split. `@nest-langchain/core` stays thin and
owns only the Nest registry/contracts. Optional packages own LangGraph,
LangSmith, tools, prompts, visualization, task patterns, and provider SDKs.

## Packages

| Package                             | Owns                                                          | Demo                                 |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| `@nest-langchain/core`              | registry, runnable contracts, shared scanner                  | `@nest-langchain/demo-basic`         |
| `@nest-langchain/langgraph`         | LangGraph decorators, discovery, runner, Command/Send helpers | `@nest-langchain/demo-langgraph`     |
| `@nest-langchain/langsmith`         | LangSmith runtime config, context, trace decorator            | `@nest-langchain/demo-langsmith`     |
| `@nest-langchain/tools`             | decorated Nest methods as LangChain tools                     | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/prompts`           | named LangChain prompt templates                              | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/patterns`          | collaborative task and Deep Agents decorators                 | `@nest-langchain/demo-patterns`      |
| `@nest-langchain/visualization`     | hosted graph docs UI and graph JSON/Mermaid/DOT endpoints     | `@nest-langchain/demo-visualization` |
| `@nest-langchain/openai`            | OpenAI chat model DI token                                    | `@nest-langchain/demo-providers`     |
| `@nest-langchain/openai-compatible` | OpenAI-compatible chat model DI tokens                        | `@nest-langchain/demo-providers`     |
| `@nest-langchain/anthropic`         | Anthropic chat model DI token                                 | `@nest-langchain/demo-providers`     |
| `@nest-langchain/gemini`            | Gemini chat model DI token                                    | `@nest-langchain/demo-providers`     |
| `@nest-langchain/bedrock`           | AWS Bedrock chat model DI token                               | `@nest-langchain/demo-providers`     |

## Install Shapes

```bash
# registry only
pnpm add @nest-langchain/core

# LangGraph decorators and execution
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph

# LangSmith tracing
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith

# LangChain tools
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod

# prompt templates
pnpm add @nest-langchain/prompts @langchain/core

# provider collaboration and task patterns
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core

# hosted graph docs
pnpm add @nest-langchain/core @nest-langchain/visualization

# provider packages
pnpm add @nest-langchain/openai @langchain/openai
pnpm add @nest-langchain/openai-compatible @langchain/openai
pnpm add @nest-langchain/anthropic @langchain/anthropic
pnpm add @nest-langchain/gemini @langchain/google-genai
pnpm add @nest-langchain/bedrock @langchain/aws
```

Provider packages expose Nest DI tokens and do not require
`@nest-langchain/core`. Packages that discover or register runnables, such as
`langgraph`, `tools`, `patterns`, and `visualization`, peer against core.

## Demos

Install once, then run any demo:

```bash
pnpm install
pnpm check
```

Core registry:

```bash
pnpm --filter @nest-langchain/demo-basic start
curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```

LangGraph:

```bash
pnpm --filter @nest-langchain/demo-langgraph start
curl "http://localhost:3000/graphs"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

LangSmith tracing:

```bash
pnpm --filter @nest-langchain/demo-langsmith start
curl -X POST "http://localhost:3000/trace" \
  -H "content-type: application/json" \
  -d '{"message":"Customer cannot complete checkout with saved card.","accountId":"acct_live_customer_42"}'
```

Tools and prompts:

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start
curl "http://localhost:3005/prompts"
curl "http://localhost:3005/tools"
```

Patterns:

```bash
pnpm --filter @nest-langchain/demo-patterns start
curl "http://localhost:3004/tasks"
```

Hosted graph docs:

```bash
pnpm --filter @nest-langchain/demo-visualization start
curl "http://localhost:3000/ai/graphs/json"
```

Provider tokens:

```bash
pnpm --filter @nest-langchain/demo-providers start
curl "http://localhost:3006/providers"
```

`demo-providers` starts without API keys. It imports a provider module only when
the required env vars are present, then exposes `POST /providers/:name/invoke`
for actual model calls.

## Core Registry Example

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { LangChainModule, LangChainRegistry } from '@nest-langchain/core';

@Module({
  imports: [LangChainModule.forRoot({ global: true })],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit() {
    this.registry.registerRunnable(
      'echo',
      {
        invoke: async (input) => ({ input }),
      },
      {
        kind: 'chain',
        nodes: ['echo'],
        tags: ['demo'],
      },
    );
  }
}
```

## LangGraph Example

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
export class SupportIntakeGraph {
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

## Hosted Visualization Example

```ts
import {
  FileLayoutStorage,
  VisualizationModule,
} from '@nest-langchain/visualization';

VisualizationModule.setup(
  '/ai/graphs',
  app,
  {
    title: 'AI Graphs',
  },
  {
    editable: true,
    layout: {
      storage: new FileLayoutStorage('.nest-langchain/layouts'),
    },
  },
);
```

Layout editing does not rewrite graph source files. Shared layouts are sidecar
artifacts; runtime/user-specific layouts can use custom storage.

## Provider Token Example

```ts
import { Inject, Injectable, Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
  OpenAIProviderModule,
} from '@nest-langchain/openai';

@Module({
  imports: [OpenAIProviderModule.forRoot()],
  providers: [SupportDraftService],
})
export class AiModule {}

@Injectable()
export class SupportDraftService {
  constructor(
    @Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)
    private readonly model: ChatOpenAI,
  ) {}

  draft(message: string) {
    return this.model.invoke(message);
  }
}
```

## More Docs

- [Architecture](docs/architecture.md)
- [Package boundaries](docs/package-boundaries.md)
- [LangGraph patterns](docs/langgraph-patterns.md)
- [Visualization](docs/visualization.md)
- [LangSmith privacy and redaction](docs/langsmith.md)
- [Publishing](docs/publishing.md)
