# @nest-langchain/bedrock

AWS Bedrock model factory를 Nest DI token으로 노출하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/bedrock @langchain/aws
```

Environment variables and AWS config:

- `AWS_REGION` or `AWS_DEFAULT_REGION`
- when region env is absent, the active `AWS_PROFILE` region from AWS config is used

`@nest-langchain/core`와 `@nest-langchain/langgraph`는 Bedrock을 직접 의존하지 않습니다.
