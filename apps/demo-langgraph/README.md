# @nest-langchain/demo-langgraph

`@nest-langchain/langgraph`의 decorator discovery와 `@nest-langchain/langsmith`의 optional tracing decorator를 보여주는 NestJS 데모입니다. 외부 LLM API key 없이 실행됩니다.

## 실행

```bash
pnpm install
pnpm check
pnpm --filter @nest-langchain/demo-langgraph start
```

## 요청

```bash
curl "http://localhost:3000/graphs"
curl -X POST "http://localhost:3000/graphs/support-intake" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a saved card error.","customerTier":"enterprise","channel":"web"}'
curl -X POST "http://localhost:3000/graphs/support-intake/invoke" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late.","customerTier":"pro","channel":"chat"}'
```
