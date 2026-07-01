import {
  DynamicModule,
  Module,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';

import {
  GeminiChatModelFactory,
  type GeminiChatModelOverrides,
} from './gemini-chat-model.factory';
import {
  NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
  getGeminiChatModelToken,
} from './tokens';

// 모듈 비공개 — index에서 export 안 함 (async 연결정보 전달용)
const GEMINI_CONNECTION_OPTIONS = Symbol(
  'nest-langchain:gemini:connection-options',
);

export interface GeminiConnectionOptions {
  apiKey?: string; // env GOOGLE_API_KEY / GEMINI_API_KEY fallback
}

export interface GeminiChatModelPreset extends GeminiChatModelOverrides {
  name: string;
  model: string; // 필수
}

export interface GeminiProviderOptions extends GeminiConnectionOptions {
  presets?: GeminiChatModelPreset[];
}

export interface GeminiProviderAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<GeminiConnectionOptions> | GeminiConnectionOptions;
  presets?: GeminiChatModelPreset[]; // 정적(토큰 이름이 정의 시점에 필요)
  extraProviders?: Provider[];
}

@Module({})
export class GeminiProviderModule {
  static forRoot(options: GeminiProviderOptions = {}): DynamicModule {
    assertUniquePresetNames(options.presets);

    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
      useFactory: () => createFactory(options), // lazy: apiKey 해석+검증
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getGeminiChatModelToken(name),
        useFactory: () => createFactory(options).create(createOptions), // name 분리됨
      }),
    );

    const providers = [factoryProvider, ...presetProviders];
    return {
      module: GeminiProviderModule,
      providers,
      exports: providers.map((provider) => providerAsToken(provider)),
    };
  }

  static forRootAsync(options: GeminiProviderAsyncOptions): DynamicModule {
    assertUniquePresetNames(options.presets);

    const connectionProvider: Provider = {
      provide: GEMINI_CONNECTION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
      useFactory: (conn: GeminiConnectionOptions) => createFactory(conn ?? {}),
      inject: [GEMINI_CONNECTION_OPTIONS],
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getGeminiChatModelToken(name),
        useFactory: (factory: GeminiChatModelFactory) =>
          factory.create(createOptions),
        inject: [NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY],
      }),
    );

    const providers = [
      connectionProvider,
      factoryProvider,
      ...presetProviders,
      ...(options.extraProviders ?? []),
    ];
    return {
      module: GeminiProviderModule,
      imports: options.imports ?? [],
      providers,
      exports: [
        NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
        ...presetProviders.map((provider) => providerAsToken(provider)),
      ],
    };
  }
}

function createFactory(
  options: GeminiConnectionOptions,
): GeminiChatModelFactory {
  const apiKey =
    options.apiKey ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is required.');
  }

  return new GeminiChatModelFactory({ apiKey });
}

function assertUniquePresetNames(presets?: GeminiChatModelPreset[]): void {
  const seen = new Set<string>();

  for (const { name } of presets ?? []) {
    const key = name.trim();

    if (seen.has(key)) {
      throw new Error(`Duplicate Gemini chat model preset name: ${key}`);
    }

    seen.add(key);
  }
}

function providerAsToken(provider: Provider): string | symbol {
  if (
    typeof provider === 'object' &&
    provider !== null &&
    'provide' in provider
  ) {
    const token = (provider as { provide: string | symbol }).provide;
    if (typeof token === 'string' || typeof token === 'symbol') {
      return token;
    }
  }
  throw new Error('Gemini provider expected a string or symbol token.');
}
