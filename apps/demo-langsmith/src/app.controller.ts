import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { TraceDemoHandler, type TraceDemoInput } from './trace-demo.handler';

interface TraceDemoBody {
  message?: string;
  accountId?: string;
}

@Controller()
export class AppController {
  constructor(private readonly traceDemoHandler: TraceDemoHandler) {}

  @Get('trace')
  traceFromQuery(
    @Query('message') message?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.traceDemoHandler.handle(normalizeInput({ message, accountId }));
  }

  @Post('trace')
  trace(@Body() body: TraceDemoBody = {}) {
    return this.traceDemoHandler.handle(normalizeInput(body));
  }
}

function normalizeInput(input: TraceDemoBody): TraceDemoInput {
  return {
    message:
      typeof input.message === 'string' && input.message.trim().length > 0
        ? input.message.trim()
        : 'Customer cannot complete checkout.',
    accountId:
      typeof input.accountId === 'string' && input.accountId.trim().length > 0
        ? input.accountId.trim()
        : 'acct_demo_001',
  };
}
