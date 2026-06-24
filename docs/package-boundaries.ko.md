# Package Boundaries

[English](package-boundaries.md) | [한국어](package-boundaries.ko.md)

`@nest-langchain/core`는 의도적으로 작게 유지합니다.

Core에서 허용되는 것:

- Nest module registration
- `LangChainRegistry`
- runnable-like contract
- generic provider scanner utility
- optional integration을 import하지 않는 test helper

Core에서 금지되는 것:

- `@langchain/langgraph`
- `langsmith`
- `@langchain/openai`
- `@langchain/anthropic`
- `@langchain/google-genai`
- `@langchain/aws`
- provider SDK
- `@langchain/core`
- visualization/rendering dependency

각 optional feature는 자기 package에 있어야 하고 runtime dependency를 peer dependency로 선언해야 합니다.

현재 optional dependency ownership:

| Package                             | Runtime Dependency It Owns                    |
| ----------------------------------- | --------------------------------------------- |
| `@nest-langchain/langgraph`         | `@langchain/langgraph`                        |
| `@nest-langchain/langsmith`         | `langsmith`                                   |
| `@nest-langchain/tools`             | `@langchain/core`, `zod`                      |
| `@nest-langchain/prompts`           | `@langchain/core`                             |
| `@nest-langchain/patterns`          | `@langchain/core`, optional `deepagents` peer |
| `@nest-langchain/openai`            | `@langchain/openai`                           |
| `@nest-langchain/openai-compatible` | `@langchain/openai`                           |
| `@nest-langchain/anthropic`         | `@langchain/anthropic`                        |
| `@nest-langchain/gemini`            | `@langchain/google-genai`                     |
| `@nest-langchain/bedrock`           | `@langchain/aws`                              |

`@nest-langchain/prompts`는 `@nest-langchain/core`가 필요하지 않습니다. 자체 Nest module로 주입 가능한 prompt registry를 노출합니다.

Provider package도 `@nest-langchain/core`를 요구하지 않습니다. provider-specific Nest token과 model factory만 노출합니다.

`@nest-langchain/patterns`는 collaborative task와 Deep Agent adapter가 runnable metadata를 core registry에 등록하므로 `@nest-langchain/core`가 필요합니다. provider SDK, LangSmith, direct LangGraph dependency를 소유하면 안 됩니다. Deep Agents support는 application이 `deepagents`를 설치하고 `@DeepAgent`를 사용할 때만 활성화됩니다.
