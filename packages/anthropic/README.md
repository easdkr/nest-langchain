# @nest-langchain/anthropic

Anthropic model factory를 Nest DI token으로 노출하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/anthropic @langchain/anthropic
```

Environment variables:

- `ANTHROPIC_API_KEY`, or `CLAUDE_API_KEY` as a compatibility fallback
- `ANTHROPIC_BASE_URL` for custom Anthropic-compatible endpoints

`@nest-langchain/core`와 `@nest-langchain/langgraph`는 Anthropic을 직접 의존하지 않습니다.
