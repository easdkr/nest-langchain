import { Controller, Get, Query } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

@Controller()
export class AppController {
  constructor(private readonly registry: LangChainRegistry) {}

  @Get('runnables')
  listRunnables() {
    return this.registry.listRunnables();
  }

  @Get('echo')
  echo(@Query('message') message = 'hello') {
    return this.registry.invoke('echo', { message });
  }
}

