import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Annotation } from '@langchain/langgraph';
import { describe, expect, it } from 'vitest';

import { GraphNode, LangGraph } from '../src/decorators';
import { LangChainModule } from '../src/lang-chain.module';
import { LangChainRegistry } from '../src/lang-chain.registry';

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

describe('LangChainExplorer', () => {
  it('discovers decorated graph providers and registers compiled graphs', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangChainModule.forRoot()],
      providers: [DemoGraph],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    expect(registry.listGraphs()).toMatchObject([
      {
        name: 'demo',
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
});

