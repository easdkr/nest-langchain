import { Controller, Get, Query } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

@Controller()
export class AppController {
  constructor(private readonly registry: LangChainRegistry) {}

  @Get('graphs/joke')
  invokeJokeGraph(@Query('topic') topic = 'Visualization') {
    return this.registry.invokeGraph('joke', { topic });
  }
}

