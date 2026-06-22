import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PatternsRegistry } from '@nest-langchain/patterns';

interface LaunchReviewBody {
  product?: string;
  market?: string;
}

@Controller()
export class AppController {
  constructor(private readonly patterns: PatternsRegistry) {}

  @Get('tasks')
  listTasks() {
    return this.patterns.listTasks();
  }

  @Post('tasks/:name')
  invokeTask(@Param('name') name: string, @Body() body: LaunchReviewBody) {
    return this.patterns.invoke(name, normalizeLaunchInput(body));
  }
}

function normalizeLaunchInput(input: LaunchReviewBody) {
  return {
    product: input.product?.trim() || 'Nest LangChain',
    market: input.market?.trim() || 'Korea',
  };
}
