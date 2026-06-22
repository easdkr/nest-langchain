import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Annotation, StateGraph } from '@langchain/langgraph';
import { LangChainRegistry } from '@nest-langchain/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConditionalEdge, GraphNode, LangGraph } from '../src/decorators';
import { LangGraphExplorer } from '../src/langgraph.explorer';
import { LangGraphModule } from '../src/langgraph.module';
import { LangGraphRunner } from '../src/langgraph.runner';

const DemoState = Annotation.Root({
  input: Annotation<string>(),
  output: Annotation<string>(),
  threadId: Annotation<string>(),
});

@Injectable()
class DemoGreeter {
  greet(input: string) {
    return `hello ${input}`;
  }
}

@LangGraph({
  name: 'demo',
  state: DemoState,
})
class DemoGraph {
  constructor(private readonly greeter: DemoGreeter) {}

  @GraphNode({
    entry: true,
    finish: true,
  })
  answer(
    state: typeof DemoState.State,
    config?: { configurable?: { thread_id?: string } },
  ) {
    return {
      output: this.greeter.greet(state.input),
      threadId: config?.configurable?.thread_id ?? 'missing-thread',
    };
  }
}

const ConditionalState = Annotation.Root({
  route: Annotation<'left' | 'right'>(),
  output: Annotation<string>(),
});

@LangGraph({
  name: 'conditional',
  state: ConditionalState,
  edges: [],
})
class ConditionalGraph {
  @GraphNode({
    entry: true,
  })
  decide() {
    return {};
  }

  @ConditionalEdge({
    from: 'decide',
    mapping: {
      left: 'left',
      right: 'right',
    },
  })
  route(state: typeof ConditionalState.State) {
    return state.route;
  }

  @GraphNode({
    finish: true,
  })
  left() {
    return {
      output: 'left branch',
    };
  }

  @GraphNode({
    finish: true,
  })
  right() {
    return {
      output: 'right branch',
    };
  }
}

describe('LangGraphExplorer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('discovers decorated graph providers and registers compiled graphs', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [DemoGraph, DemoGreeter],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    expect(registry.listGraphs()).toMatchObject([
      {
        name: 'demo',
        kind: 'graph',
        nodes: ['answer'],
      },
    ]);

    await expect(
      registry.invokeGraph<{ input: string }, { output: string }>('demo', {
        input: 'nestjs',
      }),
    ).resolves.toMatchObject({
      output: 'hello nestjs',
    });

    await moduleRef.close();
  });

  it('registers conditional edges from decorators', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [ConditionalGraph],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    await expect(
      registry.invokeGraph<{ route: 'left' | 'right' }, { output: string }>(
        'conditional',
        {
          route: 'left',
        },
      ),
    ).resolves.toMatchObject({
      output: 'left branch',
    });

    expect(registry.getGraph('conditional').edges).toContainEqual([
      'decide',
      'left',
    ]);

    await moduleRef.close();
  });

  it('invokes registered graphs through LangGraphRunner', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [DemoGraph, DemoGreeter],
    }).compile();

    await moduleRef.init();

    const service = moduleRef.get(LangGraphRunner);

    await expect(
      service.invoke<{ input: string }, { output: string }>('demo', {
        input: 'service',
      }),
    ).resolves.toMatchObject({
      output: 'hello service',
    });

    await moduleRef.close();
  });

  it('streams registered graph chunks through LangGraphRunner', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [DemoGraph, DemoGreeter],
    }).compile();

    await moduleRef.init();

    const runner = moduleRef.get(LangGraphRunner);
    const chunks = await collect(
      runner.stream<
        { input: string },
        { answer?: { output?: string; threadId?: string }; output?: string }
      >(
        'demo',
        {
          input: 'stream',
        },
        {
          configurable: {
            thread_id: 'thread-stream',
          },
        },
      ),
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(JSON.stringify(chunks)).toContain('hello stream');
    expect(JSON.stringify(chunks)).toContain('thread-stream');

    await moduleRef.close();
  });

  it('streams registered graph events through LangGraphRunner', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [DemoGraph, DemoGreeter],
    }).compile();

    await moduleRef.init();

    const runner = moduleRef.get(LangGraphRunner);
    const events = await collect(
      take(
        runner.streamEvents<
          { input: string },
          { event?: string; metadata?: Record<string, unknown> }
        >(
          'demo',
          {
            input: 'events',
          },
          {
            configurable: {
              thread_id: 'thread-events',
            },
          },
          {
            version: 'v2',
          },
        ),
        3,
      ),
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((event) => typeof event.event === 'string')).toBe(true);

    await moduleRef.close();
  });

  it('delegates runner streaming methods to graph registry methods', async () => {
    const calls: unknown[][] = [];
    const runner = new LangGraphRunner({
      streamGraph: (...args: unknown[]) => {
        calls.push(['streamGraph', ...args]);

        return asyncIterable([{ chunk: true }]);
      },
      streamGraphEvents: (...args: unknown[]) => {
        calls.push(['streamGraphEvents', ...args]);

        return asyncIterable([{ event: true }]);
      },
    } as never);

    await expect(
      collect(
        runner.stream(
          'delegated',
          { value: 1 },
          {
            configurable: { thread_id: 'thread-1' },
          },
        ),
      ),
    ).resolves.toEqual([{ chunk: true }]);
    await expect(
      collect(
        runner.streamEvents(
          'delegated',
          { value: 2 },
          {
            configurable: { thread_id: 'thread-2' },
          },
          { version: 'v2' },
        ),
      ),
    ).resolves.toEqual([{ event: true }]);
    expect(calls).toEqual([
      [
        'streamGraph',
        'delegated',
        { value: 1 },
        { configurable: { thread_id: 'thread-1' } },
      ],
      [
        'streamGraphEvents',
        'delegated',
        { value: 2 },
        { configurable: { thread_id: 'thread-2' } },
        { version: 'v2' },
      ],
    ]);
  });

  it('passes configured checkpointers to LangGraph compile', async () => {
    const checkpointer = {
      marker: 'checkpointer',
    };
    const compile = vi.spyOn(StateGraph.prototype, 'compile').mockReturnValue({
      invoke: async (input: unknown) => input,
    } as never);
    const moduleRef = await Test.createTestingModule({
      imports: [
        LangGraphModule.forRoot({
          checkpointer,
        }),
      ],
      providers: [DemoGraph, DemoGreeter],
    }).compile();

    await moduleRef.init();

    expect(compile).toHaveBeenCalledWith({
      checkpointer,
    });

    await moduleRef.close();
  });

  it('fails fast when a graph declares multiple entry nodes', async () => {
    @LangGraph({
      name: 'invalid-entry',
      state: DemoState,
    })
    class InvalidEntryGraph {
      @GraphNode({
        entry: true,
      })
      first() {
        return {};
      }

      @GraphNode({
        entry: true,
      })
      second() {
        return {};
      }
    }

    const explorer = new LangGraphExplorer(
      {
        getProviders: () => [{ instance: new InvalidEntryGraph() }],
      } as never,
      new Reflector(),
      new LangChainRegistry(),
    );

    expect(() => explorer.onModuleInit()).toThrow('multiple entry nodes');
  });
});

function asyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

async function* take<T>(
  iterable: AsyncIterable<T>,
  limit: number,
): AsyncIterable<T> {
  let count = 0;

  for await (const item of iterable) {
    yield item;
    count += 1;

    if (count >= limit) {
      return;
    }
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];

  for await (const item of iterable) {
    items.push(item);
  }

  return items;
}
