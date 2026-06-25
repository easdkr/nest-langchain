# 어떤 패키지를 설치해야 하나요?

[English](package-boundaries.md) | [한국어](package-boundaries.ko.md)

추가하려는 기능을 먼저 고르세요. 같은 행의 package와 runtime library를 설치하면 됩니다.

| 하고 싶은 일                                 | 설치할 package                      | Runtime library                 |
| -------------------------------------------- | ----------------------------------- | ------------------------------- |
| 앱의 runnable을 이름으로 등록하고 실행       | `@nest-langchain/core`              | NestJS                          |
| LangGraph workflow 작성과 실행               | `@nest-langchain/langgraph`         | `@langchain/langgraph`          |
| LangSmith tracing 추가                       | `@nest-langchain/langsmith`         | `langsmith`                     |
| Nest method를 LangChain tool로 노출          | `@nest-langchain/tools`             | `@langchain/core`, `zod`        |
| prompt template를 이름으로 관리              | `@nest-langchain/prompts`           | `@langchain/core`               |
| collaborative task workflow 실행             | `@nest-langchain/patterns`          | `@langchain/core`               |
| Deep Agents adapter 추가                     | `@nest-langchain/patterns`          | `@langchain/core`, `deepagents` |
| 앱에서 graph docs 제공                       | `@nest-langchain/visualization`     | app registry의 graph metadata   |
| OpenAI chat model 주입                       | `@nest-langchain/openai`            | `@langchain/openai`             |
| OpenAI-compatible chat model을 이름별로 주입 | `@nest-langchain/openai-compatible` | `@langchain/openai`             |
| Anthropic chat model 주입                    | `@nest-langchain/anthropic`         | `@langchain/anthropic`          |
| Gemini chat model 주입                       | `@nest-langchain/gemini`            | `@langchain/google-genai`       |
| AWS Bedrock chat model 주입                  | `@nest-langchain/bedrock`           | `@langchain/aws`                |

Maintainer가 dependency drift를 확인할 때는 다음을 실행합니다.

```bash
pnpm check:boundaries
```
