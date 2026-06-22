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
      registry.invoke('echo', { value: 1 }, { tags: ['override'] }),
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

  it('streams registered runnable chunks with merged config', async () => {
    const seenConfigs: unknown[] = [];
    const registry = new LangChainRegistry({
      defaultConfig: {
        tags: ['default'],
        metadata: {
          source: 'test',
        },
        configurable: {
          thread_id: 'default-thread',
        },
      },
    });

    registry.registerRunnable('streaming', {
      invoke: (input) => input,
      stream: async function* (input, config) {
        seenConfigs.push(config);
        yield { input, chunk: 1 };
        yield { input, chunk: 2 };
      },
    });

    await expect(
      collect(
        registry.stream(
          'streaming',
          { value: 1 },
          {
            tags: ['request'],
            configurable: {
              thread_id: 'request-thread',
            },
          },
        ),
      ),
    ).resolves.toEqual([
      { input: { value: 1 }, chunk: 1 },
      { input: { value: 1 }, chunk: 2 },
    ]);
    expect(seenConfigs[0]).toMatchObject({
      tags: ['default', 'request'],
      metadata: {
        source: 'test',
      },
      configurable: {
        thread_id: 'request-thread',
      },
    });
  });

  it('streams registered runnable events with merged config and stream options', async () => {
    const calls: Array<{
      config: unknown;
      options: unknown;
    }> = [];
    const registry = new LangChainRegistry({
      defaultConfig: {
        tags: ['default'],
        metadata: {
          source: 'default',
        },
        configurable: {
          thread_id: 'default-thread',
        },
      },
    });

    registry.registerRunnable('events', {
      invoke: (input) => input,
      streamEvents: async function* (_input, config, options) {
        calls.push({ config, options });
        yield { event: 'start' };
      },
    });

    await expect(
      collect(
        registry.streamEvents(
          'events',
          { value: 1 },
          {
            tags: ['request'],
            metadata: {
              requestId: 'req-1',
            },
            configurable: {
              thread_id: 'request-thread',
            },
          },
          {
            version: 'v2',
            tags: ['stream'],
            metadata: {
              stream: true,
            },
          },
        ),
      ),
    ).resolves.toEqual([{ event: 'start' }]);
    expect(calls[0]).toMatchObject({
      config: {
        version: 'v2',
        tags: ['default', 'request', 'stream'],
        metadata: {
          source: 'default',
          requestId: 'req-1',
          stream: true,
        },
        configurable: {
          thread_id: 'request-thread',
        },
      },
      options: {
        version: 'v2',
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

  it('keeps graph aliases for integration packages', async () => {
    const registry = new LangChainRegistry();

    registry.registerGraph({
      name: 'graph',
      kind: 'graph',
      runnable: {
        invoke: (input) => input,
      },
      nodes: ['one'],
      edges: [],
      tags: [],
      metadata: {},
    });

    expect(registry.listGraphs()).toMatchObject([
      {
        name: 'graph',
        kind: 'graph',
        nodes: ['one'],
      },
    ]);

    await expect(registry.invokeGraph('graph', { ok: true })).resolves.toEqual({
      ok: true,
    });
  });

  it('streams only graph runnables from graph streaming aliases', async () => {
    const registry = new LangChainRegistry();

    registry.registerRunnable('chain', {
      invoke: (input) => input,
      stream: async function* () {
        yield 'chunk';
      },
      streamEvents: async function* () {
        yield 'event';
      },
    });
    registry.registerGraph({
      name: 'graph',
      kind: 'graph',
      runnable: {
        invoke: (input) => input,
        stream: async function* () {
          yield 'graph-chunk';
        },
        streamEvents: async function* () {
          yield 'graph-event';
        },
      },
      nodes: ['one'],
      edges: [],
      tags: [],
      metadata: {},
    });

    expect(() => registry.streamGraph('chain', {})).toThrow(
      'Runnable "chain" is not a graph.',
    );
    expect(() => registry.streamGraphEvents('chain', {})).toThrow(
      'Runnable "chain" is not a graph.',
    );
    await expect(collect(registry.streamGraph('graph', {}))).resolves.toEqual([
      'graph-chunk',
    ]);
    await expect(
      collect(registry.streamGraphEvents('graph', {})),
    ).resolves.toEqual(['graph-event']);
  });

  it('throws clear errors when streaming is not supported', () => {
    const registry = new LangChainRegistry();

    registry.registerRunnable('invoke-only', {
      invoke: (input) => input,
    });

    expect(() => registry.stream('invoke-only', {})).toThrow(
      'Runnable "invoke-only" does not support stream().',
    );
    expect(() => registry.streamEvents('invoke-only', {})).toThrow(
      'Runnable "invoke-only" does not support streamEvents().',
    );
  });
});

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];

  for await (const item of iterable) {
    items.push(item);
  }

  return items;
}
