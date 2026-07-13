# @nest-langchain/langgraph

## 0.5.0

### Minor Changes

- c76b5c2: # Async checkpointer support via `LangGraphModule.forRootAsync`

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

## 0.4.0

### Minor Changes

- b586451: Add `defineTypedLangGraph`, a typed local-node-key builder for LangGraph decorators, same-graph command routing, Send fan-out helpers, and static edge metadata.

## 0.3.4

### Patch Changes

- 5e96b18: Refresh public README guidance so package selection and setup instructions are easier to follow.
- Updated dependencies [5e96b18]
  - @nest-langchain/core@0.1.4

## 0.3.3

### Patch Changes

- 52296c6: Add Korean translations of every package and demo README, and link the English and Korean versions from each README header.
- f1d3b34: Document where the LangGraph Command Pattern APIs are exposed in npm package READMEs.
- Updated dependencies [52296c6]
  - @nest-langchain/core@0.1.3
