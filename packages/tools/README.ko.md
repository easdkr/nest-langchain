# @nest-langchain/tools

[English](README.md) | [한국어](README.ko.md)

LangChain tool을 위한 NestJS discovery package입니다.

이 패키지는 decorated Nest provider를 scan하고, method를 `@langchain/core/tools`로 감싸며, shared registry를 통해 나열하고 실행할 수 있도록 `@nest-langchain/core`에 등록합니다.

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

`@Toolset()`은 Nest injectable metadata를 적용하므로 class는 constructor injection을 사용할 수 있습니다. 그래도 class는 Nest module의 `providers` array에 등록되어 있어야 합니다.

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
