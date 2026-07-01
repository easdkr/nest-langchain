import { ChatOpenAI } from '@langchain/openai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getOpenAICompatibleModelFactoryToken,
  getOpenAICompatibleModelToken,
  OpenAICompatibleProviderModule,
} from '../src';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function ChatOpenAIMock(config: Record<string, unknown>) {
    return {
      config,
      provider: 'openai-compatible',
    };
  }),
}));

function findProvider(
  module:
    | ReturnType<typeof OpenAICompatibleProviderModule.forRoot>
    | Record<string, unknown>,
  token: unknown,
): { useFactory: (...args: unknown[]) => unknown } {
  const providers = (module as { providers?: unknown[] }).providers ?? [];
  const candidate = providers.find(
    (
      entry,
    ): entry is {
      provide: unknown;
      useFactory: (...args: unknown[]) => unknown;
    } =>
      typeof entry === 'object' &&
      entry !== null &&
      'provide' in entry &&
      (entry as { provide: unknown }).provide === token,
  );

  if (!candidate) {
    throw new Error(`Provider for token ${String(token)} was not registered.`);
  }

  return candidate;
}

describe('OpenAICompatibleProviderModule', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', '');
    vi.stubEnv('OPENAI_COMPATIBLE_BASE_URL', '');
    vi.stubEnv('OPENAI_COMPATIBLE_MODEL', '');
    vi.stubEnv('OPENAI_COMPATIBLE_MINIMAX_API_KEY', '');
    vi.stubEnv('OPENAI_COMPATIBLE_MINIMAX_BASE_URL', '');
    vi.stubEnv('OPENAI_COMPATIBLE_MINIMAX_MODEL', '');
    vi.stubEnv('MINIMAX_API_KEY', '');
    vi.stubEnv('MINIMAX_BASE_URL', '');
    vi.stubEnv('MINIMAX_MODEL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('provides a named ChatOpenAI instance behind a deterministic Nest DI token', () => {
    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'minimax',
      apiKey: 'minimax-key',
      baseURL: 'https://api.minimax.io/v1',
      model: 'MiniMax-M3',
      temperature: 1,
      defaultHeaders: {
        'x-provider': 'minimax',
      },
      modelKwargs: {
        reasoning_split: true,
      },
    });
    const provider = findProvider(
      module,
      getOpenAICompatibleModelToken('minimax'),
    );

    expect(provider.useFactory()).toEqual({
      provider: 'openai-compatible',
      config: {
        apiKey: 'minimax-key',
        model: 'MiniMax-M3',
        temperature: 1,
        configuration: {
          baseURL: 'https://api.minimax.io/v1',
          defaultHeaders: {
            'x-provider': 'minimax',
          },
        },
        modelKwargs: {
          reasoning_split: true,
        },
      },
    });
    // 인스턴스 + 팩토리 토큰 모두 export
    expect(module.exports).toEqual([
      getOpenAICompatibleModelToken('minimax'),
      getOpenAICompatibleModelFactoryToken('minimax'),
    ]);
    expect(ChatOpenAI).toHaveBeenCalledOnce();
  });

  it('registers multiple named OpenAI-compatible models (instance + factory each)', () => {
    const module = OpenAICompatibleProviderModule.forRoot({
      models: [
        {
          name: 'kimi',
          apiKey: 'moonshot-key',
          baseURL: 'https://api.moonshot.ai/v1',
          model: 'kimi-k2.7',
        },
        {
          name: 'glm',
          apiKey: 'glm-key',
          baseURL: 'https://api.z.ai/api/paas/v4',
          model: 'glm-5.2',
        },
      ],
    });

    expect(module.exports).toEqual([
      getOpenAICompatibleModelToken('kimi'),
      getOpenAICompatibleModelFactoryToken('kimi'),
      getOpenAICompatibleModelToken('glm'),
      getOpenAICompatibleModelFactoryToken('glm'),
    ]);
    expect(module.providers).toHaveLength(4);
  });

  it('uses default and named environment fallbacks', () => {
    vi.stubEnv('OPENAI_COMPATIBLE_MINIMAX_API_KEY', 'env-minimax-key');
    vi.stubEnv(
      'OPENAI_COMPATIBLE_MINIMAX_BASE_URL',
      'https://api.minimax.io/v1',
    );
    vi.stubEnv('OPENAI_COMPATIBLE_MINIMAX_MODEL', 'MiniMax-M3');

    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'minimax',
    });
    const provider = findProvider(
      module,
      getOpenAICompatibleModelToken('minimax'),
    );

    expect(provider.useFactory()).toEqual({
      provider: 'openai-compatible',
      config: {
        apiKey: 'env-minimax-key',
        model: 'MiniMax-M3',
        temperature: 0,
        configuration: {
          baseURL: 'https://api.minimax.io/v1',
        },
      },
    });
  });

  it('supports explicit environment variable names for provider keys', () => {
    vi.stubEnv('MOONSHOT_API_KEY', 'moonshot-key');
    vi.stubEnv('KIMI_BASE_URL', 'https://api.moonshot.ai/v1');
    vi.stubEnv('KIMI_MODEL', 'kimi-k2.7');

    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'kimi',
      apiKeyEnv: 'MOONSHOT_API_KEY',
      baseURLEnv: 'KIMI_BASE_URL',
      modelEnv: 'KIMI_MODEL',
    });
    const provider = findProvider(
      module,
      getOpenAICompatibleModelToken('kimi'),
    );

    expect(provider.useFactory()).toEqual({
      provider: 'openai-compatible',
      config: {
        apiKey: 'moonshot-key',
        model: 'kimi-k2.7',
        temperature: 0,
        configuration: {
          baseURL: 'https://api.moonshot.ai/v1',
        },
      },
    });
  });

  it('rejects duplicate model names', () => {
    expect(() =>
      OpenAICompatibleProviderModule.forRoot({
        models: [{ name: 'minimax' }, { name: 'minimax' }],
      }),
    ).toThrow('Duplicate OpenAI-compatible model name "minimax".');
  });

  it('validates required API key, baseURL, and model values', () => {
    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'minimax',
      apiKey: '',
      baseURL: '',
      model: '',
    });
    const provider = findProvider(
      module,
      getOpenAICompatibleModelToken('minimax'),
    );

    expect(() => provider.useFactory()).toThrow(
      'OpenAI-compatible API key is required for model "minimax".',
    );
  });

  it('registers a named factory token alongside the instance token', () => {
    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'minimax',
      apiKey: 'minimax-key',
      baseURL: 'https://api.minimax.io/v1',
      model: 'MiniMax-M3',
    });

    expect(module.exports).toContain(
      getOpenAICompatibleModelFactoryToken('minimax'),
    );

    const factory = findProvider(
      module,
      getOpenAICompatibleModelFactoryToken('minimax'),
    ).useFactory() as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    // factory.create 는 per-call model/temperature 오버라이드를 받는다
    expect(factory.create({ model: 'MiniMax-M4', temperature: 0.5 })).toEqual({
      provider: 'openai-compatible',
      config: {
        apiKey: 'minimax-key',
        model: 'MiniMax-M4',
        temperature: 0.5,
        configuration: {
          baseURL: 'https://api.minimax.io/v1',
        },
      },
    });
  });

  it('factory.create falls back to entry defaults and inherits connection/modelKwargs', () => {
    const module = OpenAICompatibleProviderModule.forRoot({
      name: 'minimax',
      apiKey: 'minimax-key',
      baseURL: 'https://api.minimax.io/v1',
      model: 'MiniMax-M3',
      temperature: 1,
      modelKwargs: {
        reasoning_split: true,
      },
    });
    const factory = findProvider(
      module,
      getOpenAICompatibleModelFactoryToken('minimax'),
    ).useFactory() as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    // temperature 생략 → 엔트리 기본값(1) 사용; modelKwargs 도 상속
    expect(factory.create({ model: 'x' })).toEqual({
      provider: 'openai-compatible',
      config: {
        apiKey: 'minimax-key',
        model: 'x',
        temperature: 1,
        configuration: {
          baseURL: 'https://api.minimax.io/v1',
        },
        modelKwargs: {
          reasoning_split: true,
        },
      },
    });
  });
});
