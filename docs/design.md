# NestJS LangChain Integration 설계

## 목표

NestJS 서비스 코드에서 LangChain 생태계 기능을 직접 흩뿌리지 않고, 다음 세 가지를 패키지 레벨에서 표준화한다.

1. LangGraph workflow를 Nest provider와 decorator로 선언한다.
2. LangSmith tracing 설정을 Nest module option과 환경변수 정책으로 모은다.
3. graph, chain, runnable을 이름 기반 registry로 조회하고 controller, service, job에서 일관되게 실행한다.

## 비목표

- LangGraph의 모든 API를 감싸는 완전한 DSL을 만들지 않는다.
- LLM provider를 core package에 고정하지 않는다.
- LangSmith API key, provider API key를 패키지가 저장하거나 관리하지 않는다.
- LangGraph checkpoint/store/persistence를 첫 버전에서 직접 구현하지 않는다.

## 패키지 구조

```text
nest-langchain/
  packages/core/
    src/decorators/
    src/lang-chain.module.ts
    src/lang-chain.explorer.ts
    src/lang-chain.registry.ts
    src/lang-smith.environment.ts
  apps/demo/
  docs/design.md
```

첫 버전은 `@nest-langchain/core` 하나로 시작한다. 기능이 커지면 아래처럼 나눌 수 있다.

- `@nest-langchain/core`: Nest module, registry, decorator contracts
- `@nest-langchain/langgraph`: StateGraph discovery, conditional edge helpers, checkpointer adapter
- `@nest-langchain/langsmith`: per-request tracing, sampling, tenant별 project routing
- `@nest-langchain/testing`: graph registry test harness, fake model helpers

## 공개 API 초안

### LangChainModule

```ts
LangChainModule.forRoot({
  global: true,
  langSmith: {
    enabled: true,
    apiKey: process.env.LANGSMITH_API_KEY,
    project: 'commerce-ai',
    workspaceId: process.env.LANGSMITH_WORKSPACE_ID,
    background: true,
  },
  defaultConfig: {
    tags: ['nestjs'],
  },
});
```

`forRootAsync`도 제공해서 `@nestjs/config`나 secret manager에서 옵션을 가져올 수 있게 한다.

### Decorators

- `@LangGraph(options)`: class provider를 graph 정의로 표시한다.
- `@GraphNode(options?)`: provider method를 LangGraph node로 표시한다.
- `@TraceableRun(options?)`: LangSmith `traceable` wrapper를 method decorator 형태로 제공한다.

`@LangGraph`는 `state`, `entry`, `finish`, `edges`를 받는다. 복잡한 조건 분기는 core DSL로 억지로 표현하지 않고 다음 버전에서 conditional edge hook을 별도로 추가한다.

### LangChainRegistry

```ts
const result = await registry.invokeGraph('joke', {
  topic: 'NestJS',
  language: 'ko',
});
```

registry는 LangGraph에만 묶이지 않고 `invoke(input, config?)`를 가진 runnable-like 객체를 저장한다. 나중에 plain LangChain chain, agent, custom Runnable도 같은 registry에 올릴 수 있다.

## Bootstrap 흐름

1. `LangChainModule.forRoot()`가 options provider, `DiscoveryModule`, registry, explorer를 등록한다.
2. `LangSmithEnvironment`가 `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_ENDPOINT`, `LANGSMITH_WORKSPACE_ID`를 필요할 때 설정한다.
3. `LangChainExplorer`가 Nest provider를 순회하며 `@LangGraph` class를 찾는다.
4. 해당 instance의 `@GraphNode` method를 찾아 `StateGraph` node로 등록한다.
5. `entry`, `edges`, `finish` 옵션으로 `START -> node -> END` 경로를 만든다.
6. compile된 graph를 `LangChainRegistry`에 등록한다.
7. controller, service, scheduler는 registry에서 graph를 이름으로 실행한다.

## LangSmith 정책

LangSmith는 공식적으로 환경변수 기반 tracing을 지원한다. core package는 다음 원칙을 따른다.

- 모듈 option은 환경변수 설정을 도와줄 뿐, secret source가 아니다.
- `enabled: false`이면 `LANGSMITH_TRACING=false`를 명시해 로컬 데모에서 의도치 않은 trace 전송을 막는다.
- 서버리스 환경은 `background: false`를 선택해 trace flush를 기다릴 수 있게 한다.
- 민감 데이터 masking, sampling, tenant별 project routing은 `@TraceableRun` 옵션과 future `LangSmithContext`에서 확장한다.

## 에러 처리

- 같은 graph name이 두 번 등록되면 bootstrap 시점에 실패한다.
- `@LangGraph` class에 `@GraphNode`가 없으면 실패한다.
- `entry`, `finish`, `edges`가 존재하지 않는 node를 가리키면 실패한다.
- registry에 없는 graph를 실행하면 명확한 `Unknown graph` 에러를 낸다.

## 데모 범위

`apps/demo`는 외부 LLM API 없이 실행된다. LangGraph node는 deterministic TypeScript 함수로 두고, LangSmith는 환경변수를 넣었을 때만 켜진다. 실제 LLM provider 예시는 README에 추가하되 demo smoke path는 네트워크나 API key에 의존하지 않는다.

## 이후 확장 후보

- `@ConditionalEdge` decorator
- graph별 checkpointer provider token
- request scope metadata propagation
- OpenTelemetry와 LangSmith trace id 연결
- prompt registry와 LangSmith prompt pull helper
- `@Tool` decorator와 zod schema 기반 LangChain tool 생성
- E2E test utility: graph bootstrap, registry snapshot, Mermaid export 검증

