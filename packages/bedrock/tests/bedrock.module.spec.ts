import { ChatBedrockConverse } from '@langchain/aws';
import { describe, expect, it, vi } from 'vitest';

import {
  BedrockProviderModule,
  NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
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

describe('BedrockProviderModule', () => {
  it('provides a ChatBedrockConverse factory behind a Nest DI token', () => {
    const module = BedrockProviderModule.forRoot({
      model: 'anthropic.claude-test-v1:0',
      region: 'us-east-1',
      temperature: 0.4,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: 'bedrock',
      config: {
        model: 'anthropic.claude-test-v1:0',
        region: 'us-east-1',
        temperature: 0.4,
      },
    });
    expect(ChatBedrockConverse).toHaveBeenCalledOnce();
  });

  it('validates that an AWS region is configured', () => {
    const module = BedrockProviderModule.forRoot({
      region: '',
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow('AWS region is required.');
  });
});
