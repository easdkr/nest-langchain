# @nest-langchain/demo-providers

HTTP demo for provider packages:

- `@nest-langchain/openai`
- `@nest-langchain/openai-compatible`
- `@nest-langchain/anthropic`
- `@nest-langchain/gemini`
- `@nest-langchain/bedrock`

The app starts without provider API keys. It imports a provider module only when
the required environment variables are present, then exposes the configured
model through the provider package DI token.

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

OpenAI-compatible providers use the default compatible token:

```bash
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=example-chat
```
