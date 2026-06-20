import { ChatAnthropic } from '@langchain/anthropic';
import { describe, expect, it, vi } from 'vitest';

import {
  AnthropicProviderModule,
  NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
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

describe('AnthropicProviderModule', () => {
  it('provides a ChatAnthropic factory behind a Nest DI token', () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: 'anthropic-key',
      model: 'claude-test',
      temperature: 0.2,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: 'anthropic',
      config: {
        apiKey: 'anthropic-key',
        model: 'claude-test',
        temperature: 0.2,
      },
    });
    expect(ChatAnthropic).toHaveBeenCalledOnce();
  });

  it('validates that an API key is configured', () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: '',
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow(
      'Anthropic API key is required.',
    );
  });
});
