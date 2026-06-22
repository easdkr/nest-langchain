import { ChatOpenAI } from '@langchain/openai';
import { describe, expect, it, vi } from 'vitest';

import { NEST_LANGCHAIN_OPENAI_CHAT_MODEL, OpenAIProviderModule } from '../src';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function ChatOpenAIMock(config: Record<string, unknown>) {
    return {
      config,
      provider: 'openai',
    };
  }),
}));

describe('OpenAIProviderModule', () => {
  it('provides a ChatOpenAI factory behind a Nest DI token', () => {
    const module = OpenAIProviderModule.forRoot({
      apiKey: 'openai-key',
      model: 'gpt-test',
      temperature: 0.1,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: 'openai',
      config: {
        apiKey: 'openai-key',
        model: 'gpt-test',
        temperature: 0.1,
      },
    });
    expect(ChatOpenAI).toHaveBeenCalledOnce();
  });

  it('validates that an API key is configured', () => {
    const module = OpenAIProviderModule.forRoot({
      apiKey: '',
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow('OpenAI API key is required.');
  });
});
