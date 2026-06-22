import { ChatOpenAI } from '@langchain/openai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
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

  it('provides a named ChatOpenAI factory behind a deterministic Nest DI token', () => {
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
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === getOpenAICompatibleModelToken('minimax'),
    ) as { useFactory: () => unknown };

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
    expect(module.exports).toEqual([getOpenAICompatibleModelToken('minimax')]);
    expect(ChatOpenAI).toHaveBeenCalledOnce();
  });

  it('registers multiple named OpenAI-compatible models', () => {
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
      getOpenAICompatibleModelToken('glm'),
    ]);
    expect(module.providers).toHaveLength(2);
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
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === getOpenAICompatibleModelToken('minimax'),
    ) as { useFactory: () => unknown };

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
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === getOpenAICompatibleModelToken('kimi'),
    ) as { useFactory: () => unknown };

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
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === getOpenAICompatibleModelToken('minimax'),
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow(
      'OpenAI-compatible API key is required for model "minimax".',
    );
  });
});
