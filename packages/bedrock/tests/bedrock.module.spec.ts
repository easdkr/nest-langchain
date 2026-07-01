import { ChatBedrockConverse } from '@langchain/aws';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BedrockProviderModule,
  NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
  getBedrockChatModelToken,
} from '../src';

vi.mock('@langchain/aws', () => ({
  ChatBedrockConverse: vi.fn(function ChatBedrockConverseMock(
    config: Record<string, unknown>,
  ) {
    return {
      config,
      provider: 'bedrock',
    };
  }),
}));

function findProvider(
  module: ReturnType<typeof BedrockProviderModule.forRoot> | Record<string, unknown>,
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

describe('BedrockProviderModule', () => {
  beforeEach(() => {
    vi.stubEnv('AWS_PROFILE', '');
    vi.stubEnv('AWS_REGION', '');
    vi.stubEnv('AWS_DEFAULT_REGION', '');
    vi.stubEnv('AWS_CONFIG_FILE', join(tmpdir(), 'missing-aws-config'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('factory: creates ChatBedrockConverse with per-call settings via create()', () => {
    const module = BedrockProviderModule.forRoot({ region: 'us-east-1' });
    const factory = findProvider(
      module,
      NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
    ).useFactory() as { create(options: unknown): { config: Record<string, unknown> } };

    expect(
      factory.create({ model: 'anthropic.claude-test-v1:0', temperature: 0.7 }),
    ).toEqual({
      provider: 'bedrock',
      config: {
        model: 'anthropic.claude-test-v1:0',
        region: 'us-east-1',
        temperature: 0.7,
      },
    });
    // 기본 temperature 0, model fallback 없음 (전달한 model 그대로)
    expect(factory.create({ model: 'other' }).config.temperature).toBe(0);
    expect(factory.create({ model: 'other' }).config.model).toBe('other');
  });

  it('preset: registers a named token and strips name from the create config', () => {
    const module = BedrockProviderModule.forRoot({
      region: 'us-east-1',
      presets: [
        {
          name: 'creative',
          model: 'anthropic.claude-test-v1:0',
          temperature: 0.9,
        },
      ],
    });
    const token = getBedrockChatModelToken('creative');

    expect(module.exports).toContain(token);
    expect(findProvider(module, token).useFactory()).toEqual({
      provider: 'bedrock',
      config: {
        model: 'anthropic.claude-test-v1:0',
        region: 'us-east-1',
        temperature: 0.9,
      },
    }); // name 눌출 없음
  });

  it('rejects duplicate preset names', () => {
    expect(() =>
      BedrockProviderModule.forRoot({
        region: 'us-east-1',
        presets: [
          { name: 'a', model: 'm' },
          { name: 'a', model: 'n' },
        ],
      }),
    ).toThrow(/Duplicate/);
  });

  it('validates that an AWS region is configured (lazy throw from factory useFactory)', () => {
    const module = BedrockProviderModule.forRoot({});

    expect(() =>
      findProvider(module, NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY).useFactory(),
    ).toThrow('AWS region is required.');
  });

  it('validates that an AWS region is configured (lazy throw from preset useFactory)', () => {
    const module = BedrockProviderModule.forRoot({
      presets: [{ name: 'creative', model: 'anthropic.claude-test-v1:0' }],
    });

    expect(() =>
      findProvider(module, getBedrockChatModelToken('creative')).useFactory(),
    ).toThrow('AWS region is required.');
  });

  it('loads the region from the active AWS profile when region env is absent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'nest-langchain-aws-'));
    const configFile = join(directory, 'config');

    writeFileSync(
      configFile,
      '[profile smoke]\nregion = ap-northeast-2\n',
      'utf8',
    );
    vi.stubEnv('AWS_PROFILE', 'smoke');
    vi.stubEnv('AWS_REGION', '');
    vi.stubEnv('AWS_DEFAULT_REGION', '');
    vi.stubEnv('AWS_CONFIG_FILE', configFile);

    try {
      const module = BedrockProviderModule.forRoot({});
      const factory = findProvider(
        module,
        NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
      ).useFactory() as {
        create(options: unknown): { config: Record<string, unknown> };
      };

      expect(
        factory.create({ model: 'anthropic.claude-test-v1:0' }).config,
      ).toEqual({
        model: 'anthropic.claude-test-v1:0',
        region: 'ap-northeast-2',
        temperature: 0,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('forRootAsync: wires connection -> factory -> preset providers', () => {
    const module = BedrockProviderModule.forRootAsync({
      useFactory: () => ({ region: 'us-east-1' }),
      presets: [
        {
          name: 'creative',
          model: 'anthropic.claude-test-v1:0',
          temperature: 0.9,
        },
      ],
    });

    const factory = findProvider(
      module,
      NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY,
    ).useFactory({ region: 'us-east-1' }) as {
      create(options: unknown): { config: Record<string, unknown> };
    };

    expect(
      factory.create({ model: 'anthropic.claude-test-v1:0' }).config,
    ).toMatchObject({
      model: 'anthropic.claude-test-v1:0',
      region: 'us-east-1',
    });
    expect(
      findProvider(module, getBedrockChatModelToken('creative')).useFactory(factory),
    ).toEqual({
      provider: 'bedrock',
      config: {
        model: 'anthropic.claude-test-v1:0',
        region: 'us-east-1',
        temperature: 0.9,
      },
    });

    expect(module.exports).toContain(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY);
    expect(module.exports).toContain(getBedrockChatModelToken('creative'));
  });
});
