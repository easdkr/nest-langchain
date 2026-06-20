# @nest-langchain/prompts

LangChain prompt template을 Nest provider로 등록하고 이름으로 format할 수 있게 하는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/prompts @langchain/core
```

```ts
import { Module } from '@nestjs/common';
import { PromptsModule } from '@nest-langchain/prompts';

@Module({
  imports: [
    PromptsModule.forRoot({
      prompts: [
        {
          name: 'support.reply',
          template: 'Answer {customer} about {topic}',
          inputVariables: ['customer', 'topic'],
        },
      ],
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from '@nestjs/common';
import { PromptRegistry } from '@nest-langchain/prompts';

@Injectable()
export class SupportPromptService {
  constructor(private readonly prompts: PromptRegistry) {}

  reply(customer: string, topic: string) {
    return this.prompts.format('support.reply', { customer, topic });
  }
}
```
