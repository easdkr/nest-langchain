# @nest-langchain/demo-langsmith

`@nest-langchain/langsmith`의 tracing module과 `@TraceableRun` decorator를 보여주는 demo입니다. Support case를 normalize하고 account id를 redaction한 결과를 반환합니다.

기본값은 tracing off입니다.

```bash
pnpm --filter @nest-langchain/demo-langsmith start
curl -X POST "http://localhost:3000/trace" \
  -H "content-type: application/json" \
  -d '{"message":"Customer cannot complete checkout with saved card.","accountId":"acct_live_customer_42"}'
```
