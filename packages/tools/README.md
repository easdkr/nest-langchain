# @nest-langchain/tools

Nest provider method를 LangChain tool로 discovery/register하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/core @nest-langchain/tools @langchain/core zod
```

`@nest-langchain/core`는 tool implementation을 직접 의존하지 않습니다.

```ts
import { Toolset, LangTool } from '@nest-langchain/tools';
import { z } from 'zod';

@Toolset({
  tags: ['math'],
  metadata: {
    area: 'support',
  },
})
export class MathTools {
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
```

`@Toolset()` applies Nest injectable metadata for constructor injection and
adds shared tags/metadata to tools discovered from the class. The class still
has to be registered as a Nest provider.
