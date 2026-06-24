import { Module } from '@nestjs/common';
import { LangChainModule } from '@nest-langchain/core';
import { PromptsModule } from '@nest-langchain/prompts';
import { ToolsModule } from '@nest-langchain/tools';

import { AppController } from './app.controller';
import { SupportTools } from './support.tools';

@Module({
  imports: [
    LangChainModule.forRoot({ global: true }),
    ToolsModule.forRoot({ global: true }),
    PromptsModule.forRoot({
      global: true,
      prompts: [
        {
          name: 'support.reply',
          template: 'Write a {tone} support reply to {customer} about {topic}.',
          inputVariables: ['customer', 'topic', 'tone'],
          metadata: {
            owner: 'support-platform',
          },
        },
        {
          name: 'support.escalation',
          template: 'Summarize why {customer} should be escalated for {topic}.',
          inputVariables: ['customer', 'topic'],
          metadata: {
            owner: 'support-escalation',
          },
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [SupportTools],
})
export class AppModule {}
