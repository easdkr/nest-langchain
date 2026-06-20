import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LangChainRegistry } from '@nest-langchain/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LangTool, ToolsModule } from '../src';

@Injectable()
class MathTools {
  @LangTool({
    name: 'double',
    description: 'Double a number',
    schema: z.object({
      value: z.number(),
    }),
  })
  double(input: { value: number }) {
    return input.value * 2;
  }
}

describe('ToolsModule', () => {
  it('discovers decorated methods and registers LangChain tools in the core registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToolsModule.forRoot()],
      providers: [MathTools],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    expect(registry.listRunnables()).toMatchObject([
      {
        name: 'double',
        kind: 'tool',
      },
    ]);

    await expect(registry.invoke('double', { value: 21 })).resolves.toBe(42);

    await moduleRef.close();
  });
});

