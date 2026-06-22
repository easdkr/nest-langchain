# @nest-langchain/demo-patterns

HTTP demo for `@nest-langchain/patterns`. It runs a launch review task with planner, critic, and judge model roles backed by deterministic local model stubs, so it does not need provider API keys.

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
