import { ChatOpenAI } from '@langchain/openai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
  OpenAIProviderModule,
  getOpenAIChatModelToken,
} from '../src';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function ChatOpenAIMock(config: Record<string, unknown>) {
    return {
      config,
      provider: 'openai',
    };
  }),
}));

function findProvider(
  module: ReturnType<typeof OpenAIProviderModule.forRoot> | Record<string, unknown>,
  token: unknown,
): { useFactory: (...args: unknown[]) => unknown } {
  const providers = (module as { providers?: unknown[] }).providers ?? [];
  const candidate = providers.find(
    (entry): entry is { provide: unknown; useFactory: (...args: unknown[]) => unknown } =>
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

describe('OpenAIProviderModule', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('factory: creates ChatOpenAI with per-call settings via create()', () => {
    const module = OpenAIProviderModule.forRoot({ apiKey: 'openai-key' });
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
    ).useFactory() as { create(options: unknown): { config: Record<string, unknown> } };

    expect(factory.create({ model: 'gpt-x', temperature: 0.7 })).toEqual({
      provider: 'openai',
      config: {
        apiKey: 'openai-key',
        model: 'gpt-x',
        temperature: 0.7,
      },
    });
    // 기본 temperature 0, model fallback 없음 (전달한 model 그대로)
    expect(factory.create({ model: 'gpt-y' }).config.temperature).toBe(0);
    expect(factory.create({ model: 'gpt-y' }).config.model).toBe('gpt-y');
  });

  it('preset: registers a named token and strips name from the create config', () => {
    const module = OpenAIProviderModule.forRoot({
      apiKey: 'openai-key',
      presets: [{ name: 'creative', model: 'gpt-x', temperature: 0.9 }],
    });
    const token = getOpenAIChatModelToken('creative');

    expect(module.exports).toContain(token);
    expect(
      findProvider(module, token).useFactory(),
    ).toEqual({
      provider: 'openai',
      config: {
        apiKey: 'openai-key',
        model: 'gpt-x',
        temperature: 0.9,
      },
    }); // name 누수 없음
  });

  it('rejects duplicate preset names', () => {
    expect(() =>
      OpenAIProviderModule.forRoot({
        apiKey: 'openai-key',
        presets: [
          { name: 'a', model: 'm' },
          { name: 'a', model: 'n' },
        ],
      }),
    ).toThrow(/Duplicate/);
  });

  it('validates that an API key is configured (lazy throw from factory useFactory)', () => {
    const module = OpenAIProviderModule.forRoot({});

    expect(() =>
      findProvider(module, NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY).useFactory(),
    ).toThrow('OpenAI API key is required.');
  });

  it('validates that an API key is configured (lazy throw from preset useFactory)', () => {
    const module = OpenAIProviderModule.forRoot({
      presets: [{ name: 'creative', model: 'gpt-x' }],
    });

    expect(() =>
      findProvider(module, getOpenAIChatModelToken('creative')).useFactory(),
    ).toThrow('OpenAI API key is required.');
  });

  it('forRootAsync: wires connection -> factory -> preset providers', () => {
    const module = OpenAIProviderModule.forRootAsync({
      useFactory: () => ({ apiKey: 'openai-key' }),
      presets: [{ name: 'creative', model: 'gpt-x', temperature: 0.9 }],
    });

    // 연결-옵션 토큰은 비공개 → inject 인자를 수동 주입해 검증
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY,
    ).useFactory({ apiKey: 'openai-key' }) as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'gpt-x' }).config).toMatchObject({
      apiKey: 'openai-key',
      model: 'gpt-x',
    });
    expect(
      findProvider(module, getOpenAIChatModelToken('creative')).useFactory(factory),
    ).toEqual({
      provider: 'openai',
      config: {
        apiKey: 'openai-key',
        model: 'gpt-x',
        temperature: 0.9,
      },
    });

    expect(module.exports).toContain(NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY);
    expect(module.exports).toContain(getOpenAIChatModelToken('creative'));
  });
});
