import { Module } from '@nestjs/common';
import { LangGraphModule } from '@nest-langchain/langgraph';

import { AppController } from './app.controller';
import { SupportWorkflowGraph } from './graphs/support-workflow.graph';

@Module({
  imports: [LangGraphModule.forRoot({ global: true })],
  controllers: [AppController],
  providers: [SupportWorkflowGraph],
})
export class AppModule {}
