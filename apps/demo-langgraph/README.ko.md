# @nest-langchain/demo-langgraph

[English](README.md) | [한국어](README.ko.md)

`@nest-langchain/langgraph`를 위한 production-style NestJS demo입니다.

이 app은 support-intake workflow를 다음 요소로 구성합니다.

- `commandTo`와 `@GraphNode({ ends })`를 통한 `Command` routing
- `callSubgraph`로 호출되는 `support-policy` subgraph
- `sendTo`/`fanOut`을 통한 dynamic review worker
- `interruptFor`와 `resumeWith`를 통한 human approval
- optional LangSmith tracing
- optional OpenAI 또는 OpenAI-compatible response drafting

Model key 없이 시작할 수 있습니다. Model provider가 설정되지 않으면 final draft는 deterministic하게 생성되어 local run과 CI가 안정적으로 유지됩니다.

## Run

```bash
pnpm install
pnpm --filter @nest-langchain/demo-langgraph test:e2e
pnpm --filter @nest-langchain/demo-langgraph start
```

Optional model providers:

```bash
OPENAI_API_KEY=sk-... pnpm --filter @nest-langchain/demo-langgraph start

OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=example-chat
pnpm --filter @nest-langchain/demo-langgraph start
```

두 provider configuration이 모두 있으면 OpenAI가 우선됩니다. LangSmith는 `LANGSMITH_TRACING=true`와 `LANGSMITH_API_KEY`로 활성화할 수 있습니다.

## Endpoints

- `GET /graphs`
- `GET /graphs/support-intake/config`
- `POST /graphs/support-intake`
- `POST /graphs/support-intake/resume`
- `POST /graphs/support-intake/events`
- `POST /graphs/:name/invoke`

`POST /graphs/:name/invoke`는 raw registry endpoint입니다. Application-style usage에는 typed `support-intake` endpoint를 선호하세요.

## Completed Flow

```bash
curl "http://localhost:3000/graphs"
curl "http://localhost:3000/graphs/support-intake/config"

curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

Medium/low-risk request는 한 번의 call로 완료되고 다음 형태를 반환합니다.

```json
{
  "threadId": "support_...",
  "status": "completed",
  "provider": "fallback",
  "result": {
    "intent": "delivery",
    "priority": "medium",
    "routingKey": "support-delivery",
    "policy": {
      "queue": "delivery-operations"
    },
    "reviewNotes": [
      "logistics review complete for support-delivery",
      "policy review complete for delivery-operations"
    ],
    "response": "..."
  }
}
```

## Approval Flow

High-risk request는 interrupt와 함께 멈춥니다. 반환된 `threadId`를 재사용해 같은 checkpointer-backed run을 resume합니다.

```bash
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout is down and blocking our enterprise launch.","customerTier":"enterprise","channel":"web","approvalRequired":true}'

curl -X POST "http://localhost:3000/graphs/support-intake/resume" \
  -H "content-type: application/json" \
  -d '{"threadId":"support_...","decision":{"approved":true,"reviewer":"ops-lead","note":"Send the escalation draft."}}'
```

이 demo는 local checkpointing에 LangGraph `MemorySaver`를 사용합니다. Production deployment에서는 Postgres 또는 MongoDB 같은 durable checkpointer를 사용하세요.

## Event Stream

```bash
curl -N -X POST "http://localhost:3000/graphs/support-intake/events" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

이 endpoint는 `LangGraphRunner`에서 newline-delimited JSON event를 반환합니다.
