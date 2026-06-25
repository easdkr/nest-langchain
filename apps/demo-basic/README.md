# @nest-langchain/demo-basic

[English](README.md) | [한국어](README.ko.md)

Registry demo for `@nest-langchain/core`. It registers and invokes a support
triage runnable.

```bash
pnpm --filter @nest-langchain/demo-basic start
```

```bash
curl "http://localhost:3000/runnables"
curl -X POST "http://localhost:3000/support/triage" \
  -H "content-type: application/json" \
  -d '{"message":"Checkout fails with a card error","customerTier":"enterprise","channel":"web"}'
```
