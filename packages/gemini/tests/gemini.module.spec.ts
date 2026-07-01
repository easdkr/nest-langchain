import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GeminiProviderModule,
  NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
  getGeminiChatModelToken,
} from '../src';

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn(function ChatGoogleGenerativeAIMock(
    config: Record<string, unknown>,
  ) {
    return {
      config,
      provider: 'gemini',
    };
  }),
}));

function findProvider(
  module: ReturnType<typeof GeminiProviderModule.forRoot> | Record<string, unknown>,
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

describe('GeminiProviderModule', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('factory: creates ChatGoogleGenerativeAI with per-call settings via create()', () => {
    const module = GeminiProviderModule.forRoot({ apiKey: 'gemini-key' });
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
    ).useFactory() as { create(options: unknown): { config: Record<string, unknown> } };

    expect(factory.create({ model: 'gemini-x', temperature: 0.7 })).toEqual({
      provider: 'gemini',
      config: {
        apiKey: 'gemini-key',
        model: 'gemini-x',
        temperature: 0.7,
      },
    });
    // 기본 temperature 0, model fallback 없음 (전달한 model 그대로)
    expect(factory.create({ model: 'gemini-y' }).config.temperature).toBe(0);
    expect(factory.create({ model: 'gemini-y' }).config.model).toBe('gemini-y');
  });

  it('preset: registers a named token and strips name from the create config', () => {
    const module = GeminiProviderModule.forRoot({
      apiKey: 'gemini-key',
      presets: [{ name: 'creative', model: 'gemini-x', temperature: 0.9 }],
    });
    const token = getGeminiChatModelToken('creative');

    expect(module.exports).toContain(token);
    expect(findProvider(module, token).useFactory()).toEqual({
      provider: 'gemini',
      config: {
        apiKey: 'gemini-key',
        model: 'gemini-x',
        temperature: 0.9,
      },
    }); // name 누수 없음
  });

  it('rejects duplicate preset names', () => {
    expect(() =>
      GeminiProviderModule.forRoot({
        apiKey: 'gemini-key',
        presets: [
          { name: 'a', model: 'm' },
          { name: 'a', model: 'n' },
        ],
      }),
    ).toThrow(/Duplicate/);
  });

  it('validates that an API key is configured (lazy throw from factory useFactory)', () => {
    const module = GeminiProviderModule.forRoot({});

    expect(() =>
      findProvider(module, NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY).useFactory(),
    ).toThrow('Gemini API key is required.');
  });

  it('validates that an API key is configured (lazy throw from preset useFactory)', () => {
    const module = GeminiProviderModule.forRoot({
      presets: [{ name: 'creative', model: 'gemini-x' }],
    });

    expect(() =>
      findProvider(module, getGeminiChatModelToken('creative')).useFactory(),
    ).toThrow('Gemini API key is required.');
  });

  it('forRootAsync: wires connection -> factory -> preset providers', () => {
    const module = GeminiProviderModule.forRootAsync({
      useFactory: () => ({ apiKey: 'gemini-key' }),
      presets: [{ name: 'creative', model: 'gemini-x', temperature: 0.9 }],
    });

    const factory = findProvider(
      module,
      NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY,
    ).useFactory({ apiKey: 'gemini-key' }) as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'gemini-x' }).config).toMatchObject({
      apiKey: 'gemini-key',
      model: 'gemini-x',
    });
    expect(
      findProvider(module, getGeminiChatModelToken('creative')).useFactory(factory),
    ).toEqual({
      provider: 'gemini',
      config: {
        apiKey: 'gemini-key',
        model: 'gemini-x',
        temperature: 0.9,
      },
    });

    expect(module.exports).toContain(NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY);
    expect(module.exports).toContain(getGeminiChatModelToken('creative'));
  });
});
