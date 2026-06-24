# @nest-langchain/demo-providers

[English](README.md) | [한국어](README.ko.md)

Provider package를 위한 HTTP demo입니다.

- `@nest-langchain/openai`
- `@nest-langchain/openai-compatible`
- `@nest-langchain/anthropic`
- `@nest-langchain/gemini`
- `@nest-langchain/bedrock`

이 app은 provider API key 없이 시작합니다. 필요한 environment variable이 있을 때만 provider module을 import하고, configured model을 provider package DI token을 통해 노출합니다.

```bash
pnpm --filter @nest-langchain/demo-providers start
```

Endpoints:

- `GET /providers`
- `POST /providers/:name/invoke`

```bash
curl "http://localhost:3006/providers"
OPENAI_API_KEY=sk-... pnpm --filter @nest-langchain/demo-providers start
curl -X POST "http://localhost:3006/providers/openai/invoke" \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about NestJS provider tokens."}'
```

OpenAI-compatible provider는 default compatible token을 사용합니다.

```bash
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=example-chat
```
