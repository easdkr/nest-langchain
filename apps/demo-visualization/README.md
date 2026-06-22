# @nest-langchain/demo-visualization

`@nest-langchain/visualization`이 Swagger 문서처럼 서버 path에 graph UI와 API를 호스팅하는 예제입니다.

```bash
pnpm --filter @nest-langchain/demo-visualization start
```

Endpoints:

- `POST /graphs/support-workflow`
- `GET /ai/graphs`
- `GET /ai/graphs/json`
- `GET /ai/graphs/mermaid`
- `GET /ai/graphs/dot`
- `GET /ai/graphs/layouts/support-workflow`
- `PUT /ai/graphs/layouts/support-workflow`

```bash
curl -X POST "http://localhost:3000/graphs/support-workflow" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late for an enterprise customer.","customerTier":"enterprise"}'
```
