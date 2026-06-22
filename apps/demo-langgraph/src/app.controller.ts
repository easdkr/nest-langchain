import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { LangGraphRunner } from '@nest-langchain/langgraph';

interface SupportGraphInput {
  message?: string;
  customerTier?: string;
  channel?: string;
}

@Controller()
export class AppController {
  constructor(private readonly graphs: LangGraphRunner) {}

  @Get('graphs')
  listGraphs() {
    return this.graphs.listGraphs();
  }

  @Get('graphs/support-intake')
  invokeSupportIntakeFromQuery(@Query() query: SupportGraphInput) {
    return this.graphs.invoke('support-intake', normalizeInput(query));
  }

  @Post('graphs/support-intake')
  invokeSupportIntake(@Body() body: SupportGraphInput = {}) {
    return this.graphs.invoke('support-intake', normalizeInput(body));
  }

  @Post('graphs/:name/invoke')
  invokeGraph(@Param('name') name: string, @Body() body: SupportGraphInput) {
    return this.graphs.invoke(name, normalizeInput(body));
  }
}

function normalizeInput(input: SupportGraphInput) {
  return {
    message:
      typeof input.message === 'string' && input.message.trim().length > 0
        ? input.message.trim()
        : 'Checkout fails with a saved card error.',
    customerTier: normalizeTier(input.customerTier),
    channel:
      typeof input.channel === 'string' && input.channel.trim().length > 0
        ? input.channel.trim()
        : 'web',
  };
}

function normalizeTier(tier: string | undefined) {
  if (tier === 'enterprise' || tier === 'pro' || tier === 'free') {
    return tier;
  }

  return 'free';
}
