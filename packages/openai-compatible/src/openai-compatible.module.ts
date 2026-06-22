import { DynamicModule, Module, type Provider } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import {
  DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME,
  getOpenAICompatibleModelToken,
} from './tokens';

export interface OpenAICompatibleClientConfiguration {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  [key: string]: unknown;
}

export interface OpenAICompatibleChatModelOptions {
  name?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  baseURL?: string;
  baseUrl?: string;
  baseURLEnv?: string;
  model?: string;
  modelEnv?: string;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
  configuration?: OpenAICompatibleClientConfiguration;
  modelKwargs?: Record<string, unknown>;
}

export interface OpenAICompatibleProviderOptions {
  models: OpenAICompatibleChatModelOptions[];
}

export type OpenAICompatibleProviderModuleOptions =
  | OpenAICompatibleChatModelOptions
  | OpenAICompatibleProviderOptions;

@Module({})
export class OpenAICompatibleProviderModule {
  static forRoot(
    options: OpenAICompatibleProviderModuleOptions = {},
  ): DynamicModule {
    const modelOptions = normalizeModuleOptions(options);
    const providers = modelOptions.map(createModelProvider);

    return {
      module: OpenAICompatibleProviderModule,
      providers,
      exports: providers.map((provider) => provider.provide),
    };
  }
}

type ChatOpenAIConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatOpenAI>;

type ModelProvider = Provider & {
  provide: string;
};

function normalizeModuleOptions(
  options: OpenAICompatibleProviderModuleOptions,
): OpenAICompatibleChatModelOptions[] {
  const modelOptions = hasModelList(options) ? options.models : [options];

  if (modelOptions.length === 0) {
    throw new Error('At least one OpenAI-compatible model must be configured.');
  }

  const names = new Set<string>();

  for (const modelOption of modelOptions) {
    const name = normalizeName(modelOption.name);

    if (names.has(name)) {
      throw new Error(`Duplicate OpenAI-compatible model name "${name}".`);
    }

    names.add(name);
  }

  return modelOptions;
}

function hasModelList(
  options: OpenAICompatibleProviderModuleOptions,
): options is OpenAICompatibleProviderOptions {
  return 'models' in options && Array.isArray(options.models);
}

function createModelProvider(
  options: OpenAICompatibleChatModelOptions,
): ModelProvider {
  const name = normalizeName(options.name);
  const provide = getOpenAICompatibleModelToken(name);

  return {
    provide,
    useFactory: () => {
      const apiKey = resolveApiKey(name, options);
      const baseURL = resolveBaseURL(name, options);
      const model = resolveModel(name, options);

      const config: Record<string, unknown> = {
        apiKey,
        model,
        temperature: options.temperature ?? 0,
        configuration: resolveClientConfiguration(baseURL, options),
      };

      if (typeof options.timeout === 'number') {
        config.timeout = options.timeout;
      }

      if (typeof options.maxRetries === 'number') {
        config.maxRetries = options.maxRetries;
      }

      if (options.modelKwargs) {
        config.modelKwargs = options.modelKwargs;
      }

      return new (ChatOpenAI as ChatOpenAIConstructor)(config);
    },
  };
}

function resolveApiKey(
  name: string,
  options: OpenAICompatibleChatModelOptions,
): string {
  const apiKey = firstNonEmpty(
    options.apiKey,
    readEnv(options.apiKeyEnv),
    ...readDefaultEnvs(name, 'API_KEY'),
  );

  if (!apiKey) {
    throw new Error(
      `OpenAI-compatible API key is required for model "${name}".`,
    );
  }

  return apiKey;
}

function resolveBaseURL(
  name: string,
  options: OpenAICompatibleChatModelOptions,
): string {
  const baseURL = firstNonEmpty(
    options.baseURL,
    options.baseUrl,
    stringValue(options.configuration?.baseURL),
    readEnv(options.baseURLEnv),
    ...readDefaultEnvs(name, 'BASE_URL'),
  );

  if (!baseURL) {
    throw new Error(
      `OpenAI-compatible baseURL is required for model "${name}".`,
    );
  }

  return baseURL;
}

function resolveModel(
  name: string,
  options: OpenAICompatibleChatModelOptions,
): string {
  const model = firstNonEmpty(
    options.model,
    readEnv(options.modelEnv),
    ...readDefaultEnvs(name, 'MODEL'),
  );

  if (!model) {
    throw new Error(`OpenAI-compatible model is required for "${name}".`);
  }

  return model;
}

function resolveClientConfiguration(
  baseURL: string,
  options: OpenAICompatibleChatModelOptions,
): OpenAICompatibleClientConfiguration {
  const defaultHeaders = mergeDefaultHeaders(
    options.configuration?.defaultHeaders,
    options.defaultHeaders,
  );
  const configuration: OpenAICompatibleClientConfiguration = {
    ...options.configuration,
    baseURL,
  };

  if (defaultHeaders) {
    configuration.defaultHeaders = defaultHeaders;
  }

  return configuration;
}

function mergeDefaultHeaders(
  base?: Record<string, string>,
  override?: Record<string, string>,
): Record<string, string> | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...base,
    ...override,
  };
}

function normalizeName(name = DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('OpenAI-compatible model name is required.');
  }

  return trimmed;
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function readEnv(name: string | undefined): string | undefined {
  return name ? process.env[name] : undefined;
}

function readDefaultEnvs(name: string, suffix: string): string[] {
  if (name === DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME) {
    return [process.env[`OPENAI_COMPATIBLE_${suffix}`]].filter(isString);
  }

  const envPrefix = toEnvPrefix(name);

  return [
    process.env[`OPENAI_COMPATIBLE_${envPrefix}_${suffix}`],
    process.env[`${envPrefix}_${suffix}`],
  ].filter(isString);
}

function toEnvPrefix(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string';
}
