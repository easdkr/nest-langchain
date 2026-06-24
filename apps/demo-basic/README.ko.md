# @nest-langchain/demo-basic

[English](README.md) | [한국어](README.ko.md)

`@nest-langchain/core`만 사용하는 registry demo입니다. LangGraph, LangSmith, provider package를 설치하지 않아도 support triage runnable을 등록하고 실행합니다.

```bash
pnpm --filter @nest-langchain/demo-basic start
```

```bash
curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```
