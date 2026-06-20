import { Module, OnModuleInit } from '@nestjs/common';
import { LangChainModule, LangChainRegistry } from '@nest-langchain/core';

import { AppController } from './app.controller';

@Module({
  imports: [LangChainModule.forRoot({ global: true })],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit(): void {
    this.registry.registerRunnable('echo', {
      invoke: (input) => ({
        input,
        handledBy: '@nest-langchain/core',
      }),
    });
  }
}

