# @nest-langchain/demo-patterns

[English](README.md) | [한국어](README.ko.md)

`@nest-langchain/patterns`를 위한 HTTP demo입니다. Deterministic local model stub으로 backing된 planner, critic, judge model role을 사용해 launch review task를 실행하므로 provider API key가 필요하지 않습니다.

Run:

```bash
pnpm --filter @nest-langchain/demo-patterns start
```

Endpoints:

- `GET /tasks`
- `POST /tasks/launch-review`

```bash
curl "http://localhost:3004/tasks"
curl -X POST "http://localhost:3004/tasks/launch-review" \
  -H "content-type: application/json" \
  -d '{"product":"Nest LangChain Patterns","market":"Korea B2B SaaS"}'
```
