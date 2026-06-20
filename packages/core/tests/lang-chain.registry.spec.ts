import { describe, expect, it } from 'vitest';

import { LangChainRegistry } from '../src/lang-chain.registry';

describe('LangChainRegistry', () => {
  it('runs registered runnable-like objects with merged config', async () => {
    const registry = new LangChainRegistry({
      defaultConfig: {
        tags: ['default'],
        metadata: {
          source: 'test',
        },
      },
    });

    registry.registerRunnable('echo', {
      invoke: async (input, config) => ({
        input,
        config,
      }),
    });

    await expect(
      registry.invokeGraph('echo', { value: 1 }, { tags: ['override'] }),
    ).resolves.toMatchObject({
      input: { value: 1 },
      config: {
        tags: ['default', 'override'],
        metadata: {
          source: 'test',
        },
      },
    });
  });

  it('rejects duplicate graph names', () => {
    const registry = new LangChainRegistry();
    const runnable = { invoke: (input: unknown) => input };

    registry.registerRunnable('same', runnable);

    expect(() => registry.registerRunnable('same', runnable)).toThrow(
      'already registered',
    );
  });
});

