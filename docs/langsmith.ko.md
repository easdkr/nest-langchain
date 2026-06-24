# LangSmith Privacy And Redaction

[English](langsmith.md) | [한국어](langsmith.ko.md)

`@nest-langchain/langsmith`는 tracing을 opt-in으로 유지합니다. `LangSmithModule.forRoot()`의 `enabled` 기본값은 `false`입니다. trace가 process 밖으로 나가도 되는 환경에서만 명시적으로 켜세요.

## Runtime Metadata

`LangSmithContext`를 사용하면 tenant 또는 request id를 모든 method signature에 전달하지 않고 request-scoped metadata를 붙일 수 있습니다.

```ts
return LangSmithContext.run(
  {
    tenantId: request.tenantId,
    requestId: request.id,
  },
  () => service.invoke(input),
);
```

`@TraceableRun`은 metadata를 다음 순서로 병합합니다.

1. module-level `metadata`
2. decorator-level `metadata`
3. current `LangSmithContext` metadata
4. module-level `requestMetadata`
5. decorator-level `requestMetadata`

## Redaction

`redactInputs`와 `redactOutputs`를 사용해 LangSmith가 값을 기록하기 전에 변환합니다. Hook은 새 object를 반환해야 하며 받은 값을 mutate하지 않는 것이 좋습니다.

```ts
LangSmithModule.forRoot({
  enabled: true,
  redactInputs: (inputs) => ({
    ...inputs,
    authorization: '[redacted]',
    password: '[redacted]',
  }),
  redactOutputs: (outputs) => ({
    ...outputs,
    token: '[redacted]',
  }),
});
```

Decorator-level hook은 module-level hook 뒤에 실행됩니다. 민감한 workflow가 더 엄격한 redaction을 local로 추가할 수 있습니다.

## Sampling

`sampling`을 사용하면 특정 run에서 trace wrapping을 건너뛸 수 있습니다. `false`를 반환하면 원래 method를 직접 호출합니다.

```ts
LangSmithModule.forRoot({
  enabled: true,
  sampling: ({ metadata }) => metadata.plan !== 'free',
});
```

Metadata에는 raw prompt, customer identifier, API key, access token, cookie, authorization header를 넣지 마세요. route name, tenant id, workflow name, request class처럼 안정적이고 cardinality가 낮은 identifier를 선호하세요.
