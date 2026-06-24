# @nest-langchain/demo-langgraph

Production-style NestJS demo for `@nest-langchain/langgraph`.

The app models a support-intake workflow with:

- `Command` routing through `commandTo` and `@GraphNode({ ends })`
- a `support-policy` subgraph called through `callSubgraph`
- dynamic review workers through `sendTo`/`fanOut`
- human approval through `interruptFor` and `resumeWith`
- optional LangSmith tracing
- optional OpenAI or OpenAI-compatible response drafting

It starts without model keys. When no model provider is configured, the final
draft is deterministic so local runs and CI remain stable.

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

If both provider configurations are present, OpenAI is preferred. LangSmith can
be enabled with `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY`.

## Endpoints

- `GET /graphs`
- `GET /graphs/support-intake/config`
- `POST /graphs/support-intake`
- `POST /graphs/support-intake/resume`
- `POST /graphs/support-intake/events`
- `POST /graphs/:name/invoke`

`POST /graphs/:name/invoke` is the raw registry endpoint. Prefer the typed
`support-intake` endpoints for application-style usage.

## Completed Flow

```bash
curl "http://localhost:3000/graphs"
curl "http://localhost:3000/graphs/support-intake/config"

curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

Medium and low-risk requests complete in one call and return:

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

High-risk requests pause with an interrupt. Reuse the returned `threadId` to
resume the same checkpointer-backed run.

```bash
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout is down and blocking our enterprise launch.","customerTier":"enterprise","channel":"web","approvalRequired":true}'

curl -X POST "http://localhost:3000/graphs/support-intake/resume" \
  -H "content-type: application/json" \
  -d '{"threadId":"support_...","decision":{"approved":true,"reviewer":"ops-lead","note":"Send the escalation draft."}}'
```

The demo uses LangGraph `MemorySaver` for local checkpointing. Use a durable
checkpointer, such as Postgres or MongoDB, for production deployments.

## Event Stream

```bash
curl -N -X POST "http://localhost:3000/graphs/support-intake/events" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```

The endpoint returns newline-delimited JSON events from `LangGraphRunner`.
