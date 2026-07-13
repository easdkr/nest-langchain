---
'@nest-langchain/langgraph': minor
---

# Async checkpointer support via `LangGraphModule.forRootAsync`

`LangGraphModule` now exposes `forRootAsync({ imports?, inject?, useFactory })`
so production checkpointers that need async setup (`PostgresSaver`,
`MongoDBSaver`, `RedisSaver`, ...) can be resolved through a factory at app
boot instead of being constructed eagerly before `NestFactory.create()`.

## Usage

```ts
LangGraphModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const url = config.getOrThrow('DATABASE_URL');
    const checkpointer = await PostgresSaver.fromConnString(url);
    await checkpointer.setup();
    return { checkpointer };
  },
});
```

The factory returns `LangGraphModuleFactoryOptions`, so `autoDiscoverGraphs`
and `checkpointer` flow through. Configure `global` on `forRootAsync` itself
because NestJS module scope is static. When the factory depends on providers
from another module, list that module in `imports` (or mark it global) so
NestJS can inject its tokens.

## Internals

`forRoot` and `forRootAsync` now share a single dynamic-module builder. The
`LANG_GRAPH_CHECKPOINTER` token is derived from `LANG_GRAPH_MODULE_OPTIONS` in
both paths, which removes the duplicated `useValue: options.checkpointer`
registration.
