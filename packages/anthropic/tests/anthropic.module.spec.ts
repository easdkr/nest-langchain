import { ChatAnthropic } from '@langchain/anthropic';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AnthropicProviderModule,
  NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
  getAnthropicChatModelToken,
} from '../src';

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn(function ChatAnthropicMock(
    config: Record<string, unknown>,
  ) {
    return {
      config,
      provider: 'anthropic',
    };
  }),
}));

function findProvider(
  module:
    | ReturnType<typeof AnthropicProviderModule.forRoot>
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

describe('AnthropicProviderModule', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('CLAUDE_API_KEY', '');
    vi.stubEnv('ANTHROPIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('factory: creates ChatAnthropic with per-call settings via create()', () => {
    const module = AnthropicProviderModule.forRoot({ apiKey: 'anthropic-key' });
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
    ).useFactory() as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'claude-x', temperature: 0.7 })).toEqual({
      provider: 'anthropic',
      config: {
        apiKey: 'anthropic-key',
        model: 'claude-x',
        temperature: 0.7,
      },
    });
    // 기본 temperature 0, model fallback 없음 (전달한 model 그대로)
    expect(factory.create({ model: 'claude-y' }).config.temperature).toBe(0);
    expect(factory.create({ model: 'claude-y' }).config.model).toBe('claude-y');
  });

  it('resolves the anthropicApiUrl connection field onto created models', () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: 'anthropic-key',
      baseUrl: 'https://anthropic.example.test',
    });
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
    ).useFactory() as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'claude-x' }).config).toMatchObject({
      apiKey: 'anthropic-key',
      anthropicApiUrl: 'https://anthropic.example.test',
      model: 'claude-x',
      temperature: 0,
    });
  });

  it('uses Claude-compatible environment fallbacks for the connection', () => {
    vi.stubEnv('CLAUDE_API_KEY', 'claude-key');
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://anthropic.example.test');

    const module = AnthropicProviderModule.forRoot();
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
    ).useFactory() as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'claude-x' }).config).toMatchObject({
      apiKey: 'claude-key',
      anthropicApiUrl: 'https://anthropic.example.test',
      model: 'claude-x',
    });
  });

  it('preset: registers a named token and strips name from the create config', () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: 'anthropic-key',
      presets: [{ name: 'creative', model: 'claude-x', temperature: 0.9 }],
    });
    const token = getAnthropicChatModelToken('creative');

    expect(module.exports).toContain(token);
    expect(findProvider(module, token).useFactory()).toEqual({
      provider: 'anthropic',
      config: {
        apiKey: 'anthropic-key',
        model: 'claude-x',
        temperature: 0.9,
      },
    }); // name 누수 없음
  });

  it('rejects duplicate preset names', () => {
    expect(() =>
      AnthropicProviderModule.forRoot({
        apiKey: 'anthropic-key',
        presets: [
          { name: 'a', model: 'm' },
          { name: 'a', model: 'n' },
        ],
      }),
    ).toThrow(/Duplicate/);
  });

  it('validates that an API key is configured (lazy throw from factory useFactory)', () => {
    const module = AnthropicProviderModule.forRoot({});

    expect(() =>
      findProvider(
        module,
        NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
      ).useFactory(),
    ).toThrow('Anthropic API key is required.');
  });

  it('validates that an API key is configured (lazy throw from preset useFactory)', () => {
    const module = AnthropicProviderModule.forRoot({
      presets: [{ name: 'creative', model: 'claude-x' }],
    });

    expect(() =>
      findProvider(module, getAnthropicChatModelToken('creative')).useFactory(),
    ).toThrow('Anthropic API key is required.');
  });

  it('forRootAsync: wires connection -> factory -> preset providers', () => {
    const module = AnthropicProviderModule.forRootAsync({
      useFactory: () => ({ apiKey: 'anthropic-key' }),
      presets: [{ name: 'creative', model: 'claude-x', temperature: 0.9 }],
    });

    const factory = findProvider(
      module,
      NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
    ).useFactory({ apiKey: 'anthropic-key' }) as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(factory.create({ model: 'claude-x' }).config).toMatchObject({
      apiKey: 'anthropic-key',
      model: 'claude-x',
    });
    expect(
      findProvider(module, getAnthropicChatModelToken('creative')).useFactory(
        factory,
      ),
    ).toEqual({
      provider: 'anthropic',
      config: {
        apiKey: 'anthropic-key',
        model: 'claude-x',
        temperature: 0.9,
      },
    });

    expect(module.exports).toContain(
      NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
    );
    expect(module.exports).toContain(getAnthropicChatModelToken('creative'));
  });
});
