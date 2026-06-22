import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LangChainRegistry } from '@nest-langchain/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LangTool, ToolsModule, Toolset } from '../src';

@Injectable()
class MathService {
  double(value: number) {
    return value * 2;
  }
}

@Toolset({
  tags: ['math'],
  metadata: {
    area: 'demo',
  },
})
class MathTools {
  constructor(private readonly math: MathService) {}

  @LangTool({
    name: 'double',
    description: 'Double a number',
    schema: z.object({
      value: z.number(),
    }),
  })
  double(input: { value: number }) {
    return this.math.double(input.value);
  }
}

describe('ToolsModule', () => {
  it('discovers decorated methods and registers LangChain tools in the core registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToolsModule.forRoot()],
      providers: [MathTools, MathService],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    expect(registry.listRunnables()).toMatchObject([
      {
        name: 'double',
        kind: 'tool',
        tags: ['math'],
        metadata: {
          area: 'demo',
          source: 'tools',
        },
      },
    ]);

    await expect(registry.invoke('double', { value: 21 })).resolves.toBe(42);

    await moduleRef.close();
  });
});
