import { afterEach, describe, expect, it } from 'vitest';

import { LangSmithEnvironment } from '../src/langsmith.environment';

const LANGSMITH_KEYS = [
  'LANGSMITH_TRACING',
  'LANGSMITH_API_KEY',
  'LANGSMITH_ENDPOINT',
  'LANGSMITH_PROJECT',
  'LANGSMITH_WORKSPACE_ID',
  'LANGCHAIN_CALLBACKS_BACKGROUND',
  'LANGSMITH_TRACING_BACKGROUND',
] as const;

describe('LangSmithEnvironment', () => {
  const previous = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of LANGSMITH_KEYS) {
      const value = previous.get(key);

      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    previous.clear();
  });

  it('applies LangSmith options to process environment without exposing secrets', () => {
    for (const key of LANGSMITH_KEYS) {
      previous.set(key, process.env[key]);
      delete process.env[key];
    }

    const env = new LangSmithEnvironment({
      enabled: true,
      apiKey: 'lsv2_1234567890',
      endpoint: 'https://api.smith.langchain.com',
      project: 'nest-demo',
      workspaceId: 'workspace-id',
      background: false,
    });

    expect(env.apply()).toMatchObject({
      LANGSMITH_TRACING: 'true',
      LANGSMITH_API_KEY: 'lsv2...7890',
      LANGSMITH_ENDPOINT: 'https://api.smith.langchain.com',
      LANGSMITH_PROJECT: 'nest-demo',
      LANGSMITH_WORKSPACE_ID: 'workspace-id',
      LANGCHAIN_CALLBACKS_BACKGROUND: 'false',
      LANGSMITH_TRACING_BACKGROUND: 'false',
    });

    expect(process.env.LANGSMITH_API_KEY).toBe('lsv2_1234567890');
  });
});

