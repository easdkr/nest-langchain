import { Controller, Get, Query } from '@nestjs/common';
import { LangGraphService } from '@nest-langchain/langgraph';

@Controller()
export class AppController {
  constructor(private readonly graphs: LangGraphService) {}

  @Get('graphs/joke')
  invokeJokeGraph(@Query('topic') topic = 'Visualization') {
    return this.graphs.invoke('joke', { topic });
  }
}
