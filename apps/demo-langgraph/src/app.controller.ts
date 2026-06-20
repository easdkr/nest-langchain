import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { LangGraphService } from '@nest-langchain/langgraph';

interface DemoGraphInput {
  topic?: string;
  language?: 'ko' | 'en';
}

@Controller()
export class AppController {
  constructor(private readonly graphs: LangGraphService) {}

  @Get('graphs')
  listGraphs() {
    return this.graphs.listGraphs();
  }

  @Get('graphs/joke')
  invokeJokeGraph(@Query() query: DemoGraphInput) {
    return this.graphs.invoke('joke', normalizeInput(query));
  }

  @Post('graphs/:name/invoke')
  invokeGraph(@Param('name') name: string, @Body() body: DemoGraphInput) {
    return this.graphs.invoke(name, normalizeInput(body));
  }
}

function normalizeInput(input: DemoGraphInput) {
  return {
    topic: input.topic?.trim() || 'LangGraph',
    language: input.language === 'en' ? 'en' : 'ko',
  };
}
