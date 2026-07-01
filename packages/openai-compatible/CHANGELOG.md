# @nest-langchain/openai-compatible

## 0.2.0

### Minor Changes

- 4034a42: # Provider model DI: runtime factory + named presets

  All four provider packages (`openai`, `anthropic`, `gemini`, `bedrock`) now keep
  only connection info (apiKey / region / credentials) at the module level and
  move `model` + `temperature` to the call site.

  ## BREAKING (openai / anthropic / gemini / bedrock)
  - **Removed** the anonymous default-instance token
    `NEST_LANGCHAIN_<PROVIDER>_CHAT_MODEL` and the module-level `model` /
    `temperature` options (including the hardcoded default model ids).
  - `forRoot({ model, temperature })` no longer exists.

  ### Migrate to one of:
  1. **Named preset** — declare a model once, inject by name:

     ```ts
     OpenAIProviderModule.forRoot({
       apiKey: process.env.OPENAI_API_KEY,
       presets: [{ name: 'fast', model: 'gpt-4.1-mini', temperature: 0 }],
     });

     // inject it
     @InjectOpenAIChatModel('fast') model: ChatOpenAI;
     // or dynamic lookup
     getOpenAIChatModelToken('fast');
     ```

  2. **Runtime factory** — inject the factory and build models per call. `model`
     is **required** (no library default):
     ```ts
     @InjectOpenAIChatModelFactory() factory: OpenAIChatModelFactory;
     this.factory.create({ model: 'gpt-4.1', temperature: 0.9 });
     ```

  New: `forRootAsync({ useFactory, inject, presets, extraProviders })` resolves
  connection info asynchronously (e.g. from `ConfigService`); `presets` stay
  static. `temperature` defaults to `0` (neutral per-call default, model-agnostic).

  ## Additive (`openai-compatible`)
  - **New** `InjectOpenAICompatibleModelFactory(name?)` +
    `getOpenAICompatibleModelFactoryToken(name?)` expose a per-name
    `OpenAICompatibleChatModelFactory`. Its `create({ model, ... })` overrides
    per-call settings while inheriting entry-level connection info and defaults.
  - Existing `models[]`, named instance tokens, env fallback, and duplicate-name
    rejection are **unchanged**. No migration required.

## 0.1.4

### Patch Changes

- 5e96b18: Refresh public README guidance so package selection and setup instructions are easier to follow.

## 0.1.3

### Patch Changes

- 52296c6: Add Korean translations of every package and demo README, and link the English and Korean versions from each README header.
