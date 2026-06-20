# @nest-langchain/langgraph

NestJS provider를 LangGraph `StateGraph`로 discovery/compile해서 `@nest-langchain/core` registry에 등록하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/core @nest-langchain/langgraph @langchain/core @langchain/langgraph
```

`@nest-langchain/core`는 LangGraph를 직접 의존하지 않습니다. LangGraph decorator와 compile 경로가 필요할 때만 이 패키지를 설치합니다.

