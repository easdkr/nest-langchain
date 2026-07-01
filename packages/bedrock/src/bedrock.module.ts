import {
  DynamicModule,
  Module,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  BedrockChatModelFactory,
  type BedrockChatModelOverrides,
} from './bedrock-chat-model.factory';
import {
  NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
  getBedrockChatModelToken,
} from './tokens';

// 모듈 비공개 — index에서 export 안 함 (async 연결정보 전달용)
const BEDROCK_CONNECTION_OPTIONS = Symbol(
  'nest-langchain:bedrock:connection-options',
);

export interface BedrockConnectionOptions {
  region?: string;
  credentials?: unknown;
}

export interface BedrockChatModelPreset extends BedrockChatModelOverrides {
  name: string;
  model: string; // 필수
}

export interface BedrockProviderOptions extends BedrockConnectionOptions {
  presets?: BedrockChatModelPreset[];
}

export interface BedrockProviderAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: Array<string | symbol | Type<unknown>>;
  useFactory: (
    ...args: unknown[]
  ) => Promise<BedrockConnectionOptions> | BedrockConnectionOptions;
  presets?: BedrockChatModelPreset[]; // 정적(토큰 이름이 정의 시점에 필요)
  extraProviders?: Provider[];
}

@Module({})
export class BedrockProviderModule {
  static forRoot(options: BedrockProviderOptions = {}): DynamicModule {
    assertUniquePresetNames(options.presets);

    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
      useFactory: () => createFactory(options), // lazy: region 해석+검증
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getBedrockChatModelToken(name),
        useFactory: () => createFactory(options).create(createOptions), // name 분리됨
      }),
    );

    const providers = [factoryProvider, ...presetProviders];
    return {
      module: BedrockProviderModule,
      providers,
      exports: providers.map((provider) => providerAsToken(provider)),
    };
  }

  static forRootAsync(options: BedrockProviderAsyncOptions): DynamicModule {
    assertUniquePresetNames(options.presets);

    const connectionProvider: Provider = {
      provide: BEDROCK_CONNECTION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    const factoryProvider: Provider = {
      provide: NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
      useFactory: (conn: BedrockConnectionOptions) => createFactory(conn ?? {}),
      inject: [BEDROCK_CONNECTION_OPTIONS],
    };
    const presetProviders: Provider[] = (options.presets ?? []).map(
      ({ name, ...createOptions }) => ({
        provide: getBedrockChatModelToken(name),
        useFactory: (factory: BedrockChatModelFactory) =>
          factory.create(createOptions),
        inject: [NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY],
      }),
    );

    const providers = [
      connectionProvider,
      factoryProvider,
      ...presetProviders,
      ...(options.extraProviders ?? []),
    ];
    return {
      module: BedrockProviderModule,
      imports: options.imports ?? [],
      providers,
      exports: [
        NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
        ...presetProviders.map((provider) => providerAsToken(provider)),
      ],
    };
  }
}

function createFactory(
  options: BedrockConnectionOptions,
): BedrockChatModelFactory {
  const region = firstNonEmpty(
    options.region,
    process.env.AWS_REGION,
    process.env.AWS_DEFAULT_REGION,
    readAwsProfileRegion(process.env.AWS_PROFILE),
  );

  if (!region) {
    throw new Error('AWS region is required.');
  }

  return new BedrockChatModelFactory({
    region,
    ...(options.credentials ? { credentials: options.credentials } : {}),
  });
}

function assertUniquePresetNames(presets?: BedrockChatModelPreset[]): void {
  const seen = new Set<string>();

  for (const { name } of presets ?? []) {
    const key = name.trim();

    if (seen.has(key)) {
      throw new Error(`Duplicate Bedrock chat model preset name: ${key}`);
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
  throw new Error('Bedrock provider expected a string or symbol token.');
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function readAwsProfileRegion(profileName = 'default'): string | undefined {
  const configFile =
    process.env.AWS_CONFIG_FILE ?? join(homedir(), '.aws', 'config');

  try {
    return parseAwsRegion(readFileSync(configFile, 'utf8'), profileName);
  } catch {
    return undefined;
  }
}

function parseAwsRegion(
  content: string,
  profileName: string,
): string | undefined {
  const targetSections =
    profileName === 'default'
      ? new Set(['default'])
      : new Set([`profile ${profileName}`, profileName]);
  let inTargetSection = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    const section = /^\[(.+)]$/.exec(trimmed);

    if (section) {
      inTargetSection = targetSections.has(section[1].trim());
      continue;
    }

    if (!inTargetSection) {
      continue;
    }

    const region = /^region\s*=\s*(.+)$/.exec(trimmed);

    if (region) {
      return region[1].trim();
    }
  }

  return undefined;
}
