import {
  DynamicModule,
  Module,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';

import {
  AnthropicChatModelFactory,
  type AnthropicChatModelOverrides,
} from './anthropic-chat-model.factory';
import {
  NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
  getAnthropicChatModelToken,
} from './tokens';

// 모듈 비공개 — index에서 export 안 함 (async 연결정보 전달용)
const ANTHROPIC_CONNECTION_OPTIONS = Symbol(
  'nest-langchain:anthropic:connection-options',
);

export interface AnthropicConnectionOptions {
  apiKey?: string;
  baseUrl?: string;
  anthropicApiUrl?: string;
}

export interface AnthropicChatModelPreset extends AnthropicChatModelOverrides {
  name: string;
  model: string; // 필수
}

export interface AnthropicProviderOptions extends AnthropicConnectionOptions {
  presets?: AnthropicChatModelPreset[];
}

export interface AnthropicProviderAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<AnthropicConnectionOptions> | AnthropicConnectionOptions;
  presets?: AnthropicChatModelPreset[]; // 정적(토큰 이름이 정의 시점에 필요)
  extraProviders?: Provider[];
}

@Module({})
export class AnthropicProviderModule {
  static forRoot(options: AnthropicProviderOptions = {}): DynamicModule {
    assertUniquePresetNames(options.presets);

    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
      useFactory: () => createFactory(options), // lazy: apiKey 해석+검증
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getAnthropicChatModelToken(name),
        useFactory: () => createFactory(options).create(createOptions), // name 분리됨
      }),
    );

    const providers = [factoryProvider, ...presetProviders];
    return {
      module: AnthropicProviderModule,
      providers,
      exports: providers.map((provider) => providerAsToken(provider)),
    };
  }

  static forRootAsync(options: AnthropicProviderAsyncOptions): DynamicModule {
    assertUniquePresetNames(options.presets);

    const connectionProvider: Provider = {
      provide: ANTHROPIC_CONNECTION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
      useFactory: (conn: AnthropicConnectionOptions) =>
        createFactory(conn ?? {}),
      inject: [ANTHROPIC_CONNECTION_OPTIONS],
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getAnthropicChatModelToken(name),
        useFactory: (factory: AnthropicChatModelFactory) =>
          factory.create(createOptions),
        inject: [NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY],
      }),
    );

    const providers = [
      connectionProvider,
      factoryProvider,
      ...presetProviders,
      ...(options.extraProviders ?? []),
    ];
    return {
      module: AnthropicProviderModule,
      imports: options.imports ?? [],
      providers,
      exports: [
        NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
        ...presetProviders.map((provider) => providerAsToken(provider)),
      ],
    };
  }
}

function createFactory(
  options: AnthropicConnectionOptions,
): AnthropicChatModelFactory {
  const apiKey = firstNonEmpty(
    options.apiKey,
    process.env.ANTHROPIC_API_KEY,
    process.env.CLAUDE_API_KEY,
  );

  if (!apiKey) {
    throw new Error('Anthropic API key is required.');
  }

  const anthropicApiUrl = firstNonEmpty(
    options.anthropicApiUrl,
    options.baseUrl,
    process.env.ANTHROPIC_BASE_URL,
  );

  return new AnthropicChatModelFactory({
    apiKey,
    ...(anthropicApiUrl ? { anthropicApiUrl } : {}),
  });
}

function assertUniquePresetNames(presets?: AnthropicChatModelPreset[]): void {
  const seen = new Set<string>();

  for (const { name } of presets ?? []) {
    const key = name.trim();

    if (seen.has(key)) {
      throw new Error(`Duplicate Anthropic chat model preset name: ${key}`);
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
  throw new Error('Anthropic provider expected a string or symbol token.');
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}
