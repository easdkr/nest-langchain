# @nest-langchain/demo-tools-prompts

HTTP demo for `@nest-langchain/tools` and `@nest-langchain/prompts`.

It runs without provider API keys. The app registers prompt templates, discovers
a decorated Nest tool provider, and invokes both through package APIs.

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start
```

Endpoints:

- `GET /prompts`
- `POST /prompts/support-reply`
- `GET /tools`
- `POST /tools/support-priority`

```bash
curl "http://localhost:3005/prompts"
curl -X POST "http://localhost:3005/prompts/support-reply" \
  -H "content-type: application/json" \
  -d '{"customer":"Acme","topic":"checkout card failure","tone":"concise"}'
curl "http://localhost:3005/tools"
curl -X POST "http://localhost:3005/tools/support-priority" \
  -H "content-type: application/json" \
  -d '{"message":"Enterprise checkout is blocked","tier":"enterprise"}'
```
