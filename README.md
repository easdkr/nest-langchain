# nest-langchain

[English](README.md) | [한국어](README.ko.md)

Add LangChain features to a NestJS app one piece at a time. Pick what you want
to build, install the matching package, and wire it into your Nest module.

## Packages

| Package                             | Install When You Want To                         | Demo                                 |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `@nest-langchain/core`              | register and run your own runnables              | `@nest-langchain/demo-basic`         |
| `@nest-langchain/langgraph`         | build and run LangGraph workflows                | `@nest-langchain/demo-langgraph`     |
| `@nest-langchain/langsmith`         | add LangSmith tracing and request metadata       | `@nest-langchain/demo-langsmith`     |
| `@nest-langchain/tools`             | expose Nest methods as LangChain tools           | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/prompts`           | manage named prompt templates                    | `@nest-langchain/demo-tools-prompts` |
| `@nest-langchain/patterns`          | run collaborative task and Deep Agents workflows | `@nest-langchain/demo-patterns`      |
| `@nest-langchain/visualization`     | host graph docs and layout endpoints             | `@nest-langchain/demo-visualization` |
| `@nest-langchain/openai`            | inject an OpenAI chat model                      | `@nest-langchain/demo-providers`     |
| `@nest-langchain/openai-compatible` | inject named OpenAI-compatible chat models       | `@nest-langchain/demo-providers`     |
| `@nest-langchain/anthropic`         | inject an Anthropic chat model                   | `@nest-langchain/demo-providers`     |
| `@nest-langchain/gemini`            | inject a Gemini chat model                       | `@nest-langchain/demo-providers`     |
| `@nest-langchain/bedrock`           | inject an AWS Bedrock chat model                 | `@nest-langchain/demo-providers`     |

## Install Recipes

```bash
# register and run your own runnable
pnpm add @nest-langchain/core

# build LangGraph workflows
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph

# trace runs with LangSmith
pnpm add @nest-langchain/core @nest-langchain/langsmith langsmith

# expose Nest methods as tools
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod

# manage prompt templates
pnpm add @nest-langchain/prompts @langchain/core

# run collaborative task patterns
pnpm add @nest-langchain/core @nest-langchain/patterns @langchain/core

# serve graph documentation
pnpm add @nest-langchain/core @nest-langchain/visualization

# inject chat model providers
pnpm add @nest-langchain/openai @langchain/openai
pnpm add @nest-langchain/openai-compatible @langchain/openai
pnpm add @nest-langchain/anthropic @langchain/anthropic
pnpm add @nest-langchain/gemini @langchain/google-genai
pnpm add @nest-langchain/bedrock @langchain/aws
```

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
curl "http://localhost:3000/graphs/support-intake/config"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
curl -X POST "http://localhost:3000/graphs/support-intake/events" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

`demo-langgraph` starts without model keys, uses deterministic drafting by
default, and switches to OpenAI or OpenAI-compatible drafting when the matching
environment variables are present. High-risk requests return an interrupt and
resume through `POST /graphs/support-intake/resume`.

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

Each provider module exposes connection info at the module level and lets you
declare named model presets. Inject a preset by name, or inject the factory to
create models at runtime.

```ts
import { Injectable, Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  InjectOpenAIChatModel,
  InjectOpenAIChatModelFactory,
  OpenAIChatModelFactory,
  OpenAIProviderModule,
} from '@nest-langchain/openai';

@Module({
  imports: [
    OpenAIProviderModule.forRoot({
      apiKey: process.env.OPENAI_API_KEY,
      presets: [
        { name: 'fast', model: 'gpt-4.1-mini', temperature: 0 },
        { name: 'creative', model: 'gpt-4.1', temperature: 0.9 },
      ],
    }),
  ],
  providers: [SupportDraftService],
})
export class AiModule {}

@Injectable()
export class SupportDraftService {
  // inject a named preset
  constructor(
    @InjectOpenAIChatModel('fast') private readonly model: ChatOpenAI,
    @InjectOpenAIChatModelFactory()
    private readonly factory: OpenAIChatModelFactory,
  ) {}

  draft(message: string) {
    return this.model.invoke(message);
  }

  // create a model on the fly with any model id / overrides
  draftWith(model: string, message: string) {
    return this.factory.create({ model }).invoke(message);
  }
}
```

Use `getOpenAIChatModelToken(name)` for dynamic lookup. The same factory +
presets pattern applies to `@nest-langchain/anthropic`, `gemini`, and `bedrock`
(each with its own connection fields). `@nest-langchain/openai-compatible` adds
`InjectOpenAICompatibleModelFactory(name)` alongside its existing named tokens.

## More Docs

- [Architecture](docs/architecture.md)
- [Which package should I install?](docs/package-boundaries.md)
- [LangGraph patterns](docs/langgraph-patterns.md)
- [Visualization](docs/visualization.md)
- [LangSmith privacy and redaction](docs/langsmith.md)
- [Publishing](docs/publishing.md)
