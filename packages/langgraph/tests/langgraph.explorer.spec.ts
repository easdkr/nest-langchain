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
  answer(state: typeof DemoState.State) {
    return {
      output: this.greeter.greet(state.input),
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
