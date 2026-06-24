# LangGraph Patterns

[English](langgraph-patterns.md) | [한국어](langgraph-patterns.ko.md)

이 프로젝트는 LangGraph execution-control pattern을 core가 아니라 `@nest-langchain/langgraph`에 둡니다.

## Supported Primitives

| Pattern            | API                                                                    | Use When                                                                      |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Command routing    | `commandTo`, `@GraphNode({ ends })`, `CommandNode`, `RouteCommandNode` | node가 state를 update하고 다음 node를 같은 return value에서 골라야 할 때      |
| Parent handoff     | `parentHandoff`, `ParentHandoffNode`                                   | subgraph worker가 supervisor/parent graph로 control을 돌려줘야 할 때          |
| Send fan-out       | `sendTo`, `fanOut`                                                     | router, map-reduce, orchestrator-worker flow가 runtime fan-out을 쓸 때        |
| Human-in-the-loop  | `interruptFor`, `resumeWith`                                           | graph가 승인, 수정, 거절, external input을 기다리며 멈춰야 할 때              |
| Subgraph transform | `callSubgraph`                                                         | parent와 subgraph state schema가 달라 명시적 input/output mapping이 필요할 때 |

## Design Notes

- `@GraphNode({ ends })`는 LangGraph `addNode(..., { ends })`에 mapping됩니다. 같은 graph 안의 `Command` node와 함께 사용하면 가능한 dynamic destination을 graph가 검증할 수 있습니다.
- `parentHandoff`는 `graph: Command.PARENT`를 설정합니다. subgraph 안에서 실행되는 node에서만 유효합니다.
- Parent handoff destination은 parent graph에 속하므로 `ParentHandoffNode`는 `ends`를 자동 추론하지 않습니다.
- `fanOut`은 `Send[]`를 반환합니다. worker 수가 runtime에만 결정되는 conditional edge handler나 router function에서 사용합니다.
- `interruptFor`는 `try/catch`로 감싸지 않는 것이 좋습니다. interrupt 전에 수행되는 side effect는 idempotent해야 합니다.
- `callSubgraph`는 schema conversion을 명시적으로 유지합니다. parent/child graph가 서로 다른 state key를 갖는 일반적인 community guidance와 맞습니다.

## Multi-Agent Mapping

공식 예제와 community 예제는 반복적으로 다음 구조에 수렴합니다.

- Supervisor/subagents: central agent가 specialist agent를 tool 또는 graph node로 호출합니다.
- Handoffs: 현재 specialist가 다른 agent나 parent supervisor로 control을 넘깁니다.
- Router: 먼저 분류하고, 하나 이상의 specialist로 dispatch한 뒤, 결과를 synthesize합니다.
- Skills: 모든 context를 active agent에 계속 넣지 않고 필요할 때 specialized prompt/context를 load합니다.
- Custom workflow: deterministic graph node, LLM call, tool, subgraph, human interrupt를 조합합니다.

`@nest-langchain/langgraph`는 graph execution primitive를 다룹니다. `@nest-langchain/patterns`는 provider collaboration과 Deep Agents decorator adapter를 다룹니다.
