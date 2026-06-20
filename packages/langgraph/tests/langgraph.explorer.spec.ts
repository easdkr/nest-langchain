import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Annotation } from '@langchain/langgraph';
import { LangChainRegistry } from '@nest-langchain/core';
import { describe, expect, it } from 'vitest';

import { ConditionalEdge, GraphNode, LangGraph } from '../src/decorators';
import { LangGraphModule } from '../src/langgraph.module';

const DemoState = Annotation.Root({
  input: Annotation<string>(),
  output: Annotation<string>(),
});

@LangGraph({
  name: 'demo',
  state: DemoState,
  entry: 'answer',
  finish: 'answer',
})
@Injectable()
class DemoGraph {
  @GraphNode()
  answer(state: typeof DemoState.State) {
    return {
      output: `hello ${state.input}`,
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
  entry: 'decide',
  edges: [],
  finish: ['left', 'right'],
})
@Injectable()
class ConditionalGraph {
  @GraphNode()
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

  @GraphNode()
  left() {
    return {
      output: 'left branch',
    };
  }

  @GraphNode()
  right() {
    return {
      output: 'right branch',
    };
  }
}

describe('LangGraphExplorer', () => {
  it('discovers decorated graph providers and registers compiled graphs', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [DemoGraph],
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
      registry.invokeGraph<
        { route: 'left' | 'right' },
        { output: string }
      >('conditional', {
        route: 'left',
      }),
    ).resolves.toMatchObject({
      output: 'left branch',
    });

    expect(registry.getGraph('conditional').edges).toContainEqual([
      'decide',
      'left',
    ]);

    await moduleRef.close();
  });
});
