# @nest-langchain/tools

[English](README.md) | [한국어](README.ko.md)

NestJS discovery for LangChain tools.

This package scans decorated Nest providers, wraps methods with
`@langchain/core/tools`, and registers them in `@nest-langchain/core` so they can
be listed and invoked through the shared registry.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod
```

## Module

```ts
import { Module } from '@nestjs/common';
import { LangChainModule } from '@nest-langchain/core';
import { ToolsModule } from '@nest-langchain/tools';

@Module({
  imports: [
    LangChainModule.forRoot({ global: true }),
    ToolsModule.forRoot({ global: true }),
  ],
  providers: [MathTools],
})
export class AppModule {}
```

## Define Tools

```ts
import { LangTool, Toolset } from '@nest-langchain/tools';
import { z } from 'zod';

@Toolset({
  tags: ['math'],
  metadata: {
    owner: 'support-platform',
  },
})
export class MathTools {
  @LangTool({
    name: 'double',
    description: 'Double a number.',
    schema: z.object({
      value: z.number(),
    }),
  })
  double(input: { value: number }) {
    return String(input.value * 2);
  }
}
```

`@Toolset()` applies Nest injectable metadata, so the class can use constructor
injection. The class must still be listed in a Nest module `providers` array.

## Invoke Through Core

```ts
import { Injectable } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

@Injectable()
export class ToolRunner {
  constructor(private readonly registry: LangChainRegistry) {}

  run() {
    return this.registry.invoke('double', { value: 21 });
  }
}
```

## Demo

```bash
pnpm --filter @nest-langchain/demo-tools-prompts start

curl "http://localhost:3005/tools"
curl -X POST "http://localhost:3005/tools/support-priority" \
  -H "content-type: application/json" \
  -d '{"message":"Enterprise checkout is blocked","tier":"enterprise"}'
```
