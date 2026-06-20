# Architecture

`nest-langchain` is organized as a thin core plus optional integration packages.
Consumers install only the feature packages they need.

## Layering

```text
Nest app
  -> @nest-langchain/core
  -> optional packages:
       @nest-langchain/langgraph
       @nest-langchain/langsmith
       @nest-langchain/tools
       @nest-langchain/prompts
       @nest-langchain/patterns
       @nest-langchain/visualization
       @nest-langchain/openai
       @nest-langchain/anthropic
       @nest-langchain/gemini
       @nest-langchain/bedrock
```

`@nest-langchain/core` owns only Nest module registration, provider discovery
helpers, runnable-like contracts, and `LangChainRegistry`.

Optional packages own their runtime dependency imports:

| Package                         | Runtime Dependency Boundary                 |
| ------------------------------- | ------------------------------------------- |
| `@nest-langchain/langgraph`     | `@langchain/langgraph`                      |
| `@nest-langchain/langsmith`     | `langsmith`                                 |
| `@nest-langchain/tools`         | `@langchain/core`, `zod`                    |
| `@nest-langchain/prompts`       | `@langchain/core`                           |
| `@nest-langchain/patterns`      | `@langchain/core`, optional `deepagents`    |
| `@nest-langchain/visualization` | hosted docs UI and graph metadata rendering |
| provider packages               | provider-specific LangChain SDK             |

## Runtime Registration

1. Core registers `LangChainRegistry`.
2. Feature modules discover their own decorators/providers.
3. Feature modules register runnable metadata into core only when installed.
4. Application controllers or services use the feature package API.
5. Collaborative patterns register provider collaboration tasks and optional Deep Agents into core.
6. Visualization reads neutral metadata from core and serves docs routes when
   `VisualizationModule.setup(path, app, options)` is called.

## Visualization Layout

Graph source code is the execution source of truth. Layout state is presentation
state and is stored through a `VisualGraphLayoutStorage` adapter.

- read-only storage returns automatic layout only
- browser storage uses local storage and creates no repository diff
- file storage writes sidecar JSON such as `.nest-langchain/layouts/*.json`
- custom storage can persist shared layout in a database or admin service

The default visualization package does not rewrite `.ts` graph source files.

## Detailed Design

See [design.md](design.md) for API examples, runtime flow, and verification
rules.
