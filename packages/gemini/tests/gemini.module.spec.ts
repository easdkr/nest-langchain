import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { describe, expect, it, vi } from 'vitest';

import { GeminiProviderModule, NEST_LANGCHAIN_GEMINI_CHAT_MODEL } from '../src';

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

describe('GeminiProviderModule', () => {
  it('provides a ChatGoogleGenerativeAI factory behind a Nest DI token', () => {
    const module = GeminiProviderModule.forRoot({
      apiKey: 'gemini-key',
      model: 'gemini-test',
      temperature: 0.3,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_GEMINI_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: 'gemini',
      config: {
        apiKey: 'gemini-key',
        model: 'gemini-test',
        temperature: 0.3,
      },
    });
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledOnce();
  });

  it('validates that an API key is configured', () => {
    const module = GeminiProviderModule.forRoot({
      apiKey: '',
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === NEST_LANGCHAIN_GEMINI_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow('Gemini API key is required.');
  });
});
