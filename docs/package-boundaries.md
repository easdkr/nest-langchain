# Package Boundaries

`@nest-langchain/core` is intentionally small.

Allowed in core:

- Nest module registration
- `LangChainRegistry`
- runnable-like contracts
- generic provider scanner utilities
- test helpers that do not import optional integrations

Forbidden in core:

- `@langchain/langgraph`
- `langsmith`
- `@langchain/openai`
- `@langchain/anthropic`
- `@langchain/google-genai`
- `@langchain/aws`
- provider SDKs
- `@langchain/core`
- visualization/rendering dependencies

Each optional feature must live in its own package and declare its runtime dependency as a peer dependency.

Current optional dependency ownership:

| Package                     | Runtime Dependency It Owns                    |
| --------------------------- | --------------------------------------------- |
| `@nest-langchain/langgraph` | `@langchain/langgraph`                        |
| `@nest-langchain/langsmith` | `langsmith`                                   |
| `@nest-langchain/tools`     | `@langchain/core`, `zod`                      |
| `@nest-langchain/prompts`   | `@langchain/core`                             |
| `@nest-langchain/patterns`  | `@langchain/core`, optional `deepagents` peer |
| `@nest-langchain/openai`    | `@langchain/openai`                           |
| `@nest-langchain/anthropic` | `@langchain/anthropic`                        |
| `@nest-langchain/gemini`    | `@langchain/google-genai`                     |
| `@nest-langchain/bedrock`   | `@langchain/aws`                              |

`@nest-langchain/prompts` does not need `@nest-langchain/core`; it exposes a prompt registry that can be injected through its own Nest module.

Provider packages do not require `@nest-langchain/core`; they expose provider-specific Nest tokens and model factories only.

`@nest-langchain/patterns` requires `@nest-langchain/core` because collaborative tasks and Deep Agent adapters register runnable metadata into the core registry. It must not own provider SDKs, LangSmith, or a direct LangGraph dependency. Deep Agents support is enabled only when the application installs `deepagents` and uses `@DeepAgent`.
