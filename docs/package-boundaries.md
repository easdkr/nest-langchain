# Which Package Should I Install?

[English](package-boundaries.md) | [한국어](package-boundaries.ko.md)

Start with the feature you are adding. Install the package in the same row and
the listed runtime library.

| I Want To                                  | Install                             | Runtime Library                      |
| ------------------------------------------ | ----------------------------------- | ------------------------------------ |
| register and run app-owned runnables       | `@nest-langchain/core`              | NestJS                               |
| build LangGraph workflows                  | `@nest-langchain/langgraph`         | `@langchain/langgraph`               |
| add LangSmith tracing                      | `@nest-langchain/langsmith`         | `langsmith`                          |
| expose Nest methods as LangChain tools     | `@nest-langchain/tools`             | `@langchain/core`, `zod`             |
| manage prompt templates by name            | `@nest-langchain/prompts`           | `@langchain/core`                    |
| run collaborative task workflows           | `@nest-langchain/patterns`          | `@langchain/core`                    |
| add Deep Agents adapters                   | `@nest-langchain/patterns`          | `@langchain/core`, `deepagents`      |
| serve graph docs from my app               | `@nest-langchain/visualization`     | graph metadata from the app registry |
| inject an OpenAI chat model                | `@nest-langchain/openai`            | `@langchain/openai`                  |
| inject named OpenAI-compatible chat models | `@nest-langchain/openai-compatible` | `@langchain/openai`                  |
| inject an Anthropic chat model             | `@nest-langchain/anthropic`         | `@langchain/anthropic`               |
| inject a Gemini chat model                 | `@nest-langchain/gemini`            | `@langchain/google-genai`            |
| inject an AWS Bedrock chat model           | `@nest-langchain/bedrock`           | `@langchain/aws`                     |

Maintainers can verify dependency drift with:

```bash
pnpm check:boundaries
```
