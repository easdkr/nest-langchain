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
- provider SDKs
- `@langchain/core`
- visualization/rendering dependencies

Each optional feature must live in its own package and declare its runtime dependency as a peer dependency.

Current optional dependency ownership:

| Package | Runtime Dependency It Owns |
|---|---|
| `@nest-langchain/langgraph` | `@langchain/langgraph` |
| `@nest-langchain/langsmith` | `langsmith` |
| `@nest-langchain/tools` | `@langchain/core`, `zod` |
| `@nest-langchain/prompts` | `@langchain/core` |
| `@nest-langchain/openai` | `@langchain/openai` |

`@nest-langchain/prompts` does not need `@nest-langchain/core`; it exposes a prompt registry that can be injected through its own Nest module.
