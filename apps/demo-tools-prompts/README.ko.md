# @nest-langchain/demo-tools-prompts

[English](README.md) | [한국어](README.ko.md)

`@nest-langchain/tools`와 `@nest-langchain/prompts`를 위한 HTTP demo입니다.

Provider API key 없이 실행됩니다. 이 app은 prompt template을 등록하고, decorated Nest tool provider를 발견하며, package API를 통해 둘 다 실행합니다.

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
