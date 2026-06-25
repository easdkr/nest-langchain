# Architecture

[English](architecture.md) | [한국어](architecture.ko.md)

`nest-langchain` lets a Nest app add one LangChain capability at a time. Start
with the registry, then add the feature module your app needs.

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
       @nest-langchain/openai-compatible
       @nest-langchain/anthropic
       @nest-langchain/gemini
       @nest-langchain/bedrock
```

Feature modules connect your Nest app to these runtime libraries:

| Package                         | Runtime Library                             |
| ------------------------------- | ------------------------------------------- |
| `@nest-langchain/langgraph`     | `@langchain/langgraph`                      |
| `@nest-langchain/langsmith`     | `langsmith`                                 |
| `@nest-langchain/tools`         | `@langchain/core`, `zod`                    |
| `@nest-langchain/prompts`       | `@langchain/core`                           |
| `@nest-langchain/patterns`      | `@langchain/core`, optional `deepagents`    |
| `@nest-langchain/visualization` | hosted docs UI and graph metadata rendering |
| provider packages               | provider-specific LangChain SDK             |

## What Happens At Runtime

1. `LangChainModule` registers `LangChainRegistry`.
2. Feature modules discover their decorators and providers.
3. Installed feature modules add their runnable metadata to the registry.
4. Controllers and services call the feature package API.
5. Collaborative patterns add task workflows and Deep Agents metadata.
6. Visualization reads registry metadata and serves docs routes when
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
commands.
