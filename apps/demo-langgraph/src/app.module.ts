import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemorySaver } from '@langchain/langgraph';

import { LangGraphModule } from '@nest-langchain/langgraph';
import { LangSmithModule } from '@nest-langchain/langsmith';

import { AppController } from './app.controller';
import { SupportIntakeGraph } from './graphs/support-intake.graph';
import { SupportPolicyGraph } from './graphs/support-policy.graph';
import { buildModelProviderImports } from './provider-catalog';
import { SupportDraftService } from './support-draft.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...buildModelProviderImports(),
    LangGraphModule.forRoot({
      global: true,
      checkpointer: new MemorySaver(),
    }),
    LangSmithModule.forRoot({
      enabled: process.env.LANGSMITH_TRACING === 'true',
      apiKey: process.env.LANGSMITH_API_KEY || undefined,
      endpoint: process.env.LANGSMITH_ENDPOINT || undefined,
      project: process.env.LANGSMITH_PROJECT || 'nest-langchain-demo',
      workspaceId: process.env.LANGSMITH_WORKSPACE_ID || undefined,
      background: process.env.LANGCHAIN_CALLBACKS_BACKGROUND !== 'false',
    }),
  ],
  controllers: [AppController],
  providers: [SupportDraftService, SupportPolicyGraph, SupportIntakeGraph],
})
export class AppModule {}
