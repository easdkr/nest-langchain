import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { LangChainRegistry } from '@nest-langchain/core';

interface DemoGraphInput {
  topic?: string;
  language?: 'ko' | 'en';
}

@Controller()
export class AppController {
  constructor(private readonly registry: LangChainRegistry) {}

  @Get('graphs')
  listGraphs() {
    return this.registry.listGraphs();
  }

  @Get('graphs/joke')
  invokeJokeGraph(@Query() query: DemoGraphInput) {
    return this.registry.invokeGraph('joke', normalizeInput(query));
  }

  @Post('graphs/:name/invoke')
  invokeGraph(@Param('name') name: string, @Body() body: DemoGraphInput) {
    return this.registry.invokeGraph(name, normalizeInput(body));
  }
}

function normalizeInput(input: DemoGraphInput) {
  return {
    topic: input.topic?.trim() || 'LangGraph',
    language: input.language === 'en' ? 'en' : 'ko',
  };
}

