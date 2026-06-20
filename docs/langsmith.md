# LangSmith Privacy And Redaction

`@nest-langchain/langsmith` keeps tracing opt-in. `LangSmithModule.forRoot()` defaults `enabled` to `false`; enable it explicitly for environments where traces may leave the process.

## Runtime Metadata

Use `LangSmithContext` to attach request-scoped metadata without passing tenant or request IDs through every method signature.

```ts
return LangSmithContext.run(
  {
    tenantId: request.tenantId,
    requestId: request.id,
  },
  () => service.invoke(input),
);
```

`@TraceableRun` merges metadata in this order:

1. module-level `metadata`
2. decorator-level `metadata`
3. current `LangSmithContext` metadata
4. module-level `requestMetadata`
5. decorator-level `requestMetadata`

## Redaction

Use `redactInputs` and `redactOutputs` to transform values before LangSmith logs them. Hooks must return a new object and should not mutate the received value.

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

Decorator-level hooks run after module-level hooks, which lets a sensitive workflow add stricter redaction locally.

## Sampling

Use `sampling` to skip trace wrapping for a run. Returning `false` calls the original method directly.

```ts
LangSmithModule.forRoot({
  enabled: true,
  sampling: ({ metadata }) => metadata.plan !== 'free',
});
```

Avoid raw prompts, customer identifiers, API keys, access tokens, cookies, and authorization headers in metadata. Prefer stable low-cardinality identifiers such as route name, tenant id, workflow name, and request class.
