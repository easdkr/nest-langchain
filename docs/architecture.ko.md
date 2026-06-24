# Architecture

[English](architecture.md) | [한국어](architecture.ko.md)

`nest-langchain`은 얇은 core와 선택형 integration package로 구성됩니다. 사용자는 필요한 feature package만 설치합니다.

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

`@nest-langchain/core`는 Nest module registration, provider discovery helper, runnable-like contract, `LangChainRegistry`만 소유합니다.

선택 패키지는 각자의 runtime dependency import를 소유합니다.

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

1. Core가 `LangChainRegistry`를 등록합니다.
2. Feature module이 자기 decorator/provider를 발견합니다.
3. Feature module은 설치된 경우에만 runnable metadata를 core에 등록합니다.
4. Application controller 또는 service가 feature package API를 사용합니다.
5. Collaborative patterns는 provider collaboration task와 optional Deep Agents를 core에 등록합니다.
6. Visualization은 core의 neutral metadata를 읽고 `VisualizationModule.setup(path, app, options)`가 호출되면 docs route를 제공합니다.

## Visualization Layout

Graph source code가 실행의 source of truth입니다. Layout state는 presentation state이며 `VisualGraphLayoutStorage` adapter를 통해 저장됩니다.

- read-only storage는 automatic layout만 반환합니다.
- browser storage는 local storage를 사용하며 repository diff를 만들지 않습니다.
- file storage는 `.nest-langchain/layouts/*.json` 같은 sidecar JSON을 씁니다.
- custom storage는 database 또는 admin service에 공유 layout을 저장할 수 있습니다.

기본 visualization package는 `.ts` graph source file을 다시 쓰지 않습니다.

## Detailed Design

API 예시, runtime flow, verification rule은 [design.ko.md](design.ko.md)를 참고하세요.
