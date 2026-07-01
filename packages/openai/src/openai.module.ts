import {
  DynamicModule,
  Module,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';

import {
  OpenAIChatModelFactory,
  type OpenAIChatModelOverrides,
} from './openai-chat-model.factory';
import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
  getOpenAIChatModelToken,
} from './tokens';

// 모듈 비공개 — index에서 export 안 함 (async 연결정보 전달용)
const OPENAI_CONNECTION_OPTIONS = Symbol('nest-langchain:openai:connection-options');

export interface OpenAIConnectionOptions {
  apiKey?: string; // env OPENAI_API_KEY fallback
}

export interface OpenAIChatModelPreset extends OpenAIChatModelOverrides {
  name: string;
  model: string; // 필수
}

export interface OpenAIProviderOptions extends OpenAIConnectionOptions {
  presets?: OpenAIChatModelPreset[];
}

export interface OpenAIProviderAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<OpenAIConnectionOptions> | OpenAIConnectionOptions;
  presets?: OpenAIChatModelPreset[]; // 정적(토큰 이름이 정의 시점에 필요)
  extraProviders?: Provider[];
}

@Module({})
export class OpenAIProviderModule {
  static forRoot(options: OpenAIProviderOptions = {}): DynamicModule {
    assertUniquePresetNames(options.presets);

    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
      useFactory: () => createFactory(options), // lazy: apiKey 해석+검증
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getOpenAIChatModelToken(name),
        useFactory: () => createFactory(options).create(createOptions), // name 분리됨
      }),
    );

    const providers = [factoryProvider, ...presetProviders];
    return {
      module: OpenAIProviderModule,
      providers,
      exports: providers.map((provider) => providerAsToken(provider)),
    };
  }

  static forRootAsync(options: OpenAIProviderAsyncOptions): DynamicModule {
    assertUniquePresetNames(options.presets);

    const connectionProvider: Provider = {
      provide: OPENAI_CONNECTION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
      useFactory: (conn: OpenAIConnectionOptions) => createFactory(conn ?? {}),
      inject: [OPENAI_CONNECTION_OPTIONS],
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getOpenAIChatModelToken(name),
        useFactory: (factory: OpenAIChatModelFactory) =>
          factory.create(createOptions),
        inject: [NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY],
      }),
    );

    const providers = [
      connectionProvider,
      factoryProvider,
      ...presetProviders,
      ...(options.extraProviders ?? []),
    ];
    return {
      module: OpenAIProviderModule,
      imports: options.imports ?? [],
      providers,
      exports: [
        NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
        ...presetProviders.map((provider) => providerAsToken(provider)),
      ],
    };
  }
}

function createFactory(options: OpenAIConnectionOptions): OpenAIChatModelFactory {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key is required.');
  }

  return new OpenAIChatModelFactory({ apiKey });
}

function assertUniquePresetNames(presets?: OpenAIChatModelPreset[]): void {
  const seen = new Set<string>();

  for (const { name } of presets ?? []) {
    const key = name.trim();

    if (seen.has(key)) {
      throw new Error(`Duplicate OpenAI chat model preset name: ${key}`);
    }

    seen.add(key);
  }
}

function providerAsToken(provider: Provider): string | symbol {
  if (typeof provider === 'object' && provider !== null && 'provide' in provider) {
    const token = (provider as { provide: string | symbol }).provide;
    if (typeof token === 'string' || typeof token === 'symbol') {
      return token;
    }
  }
  throw new Error('OpenAI provider expected a string or symbol token.');
}
