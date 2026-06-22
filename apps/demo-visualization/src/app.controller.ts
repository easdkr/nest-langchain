import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LangGraphRunner } from '@nest-langchain/langgraph';

interface SupportWorkflowInput {
  message?: string;
  customerTier?: string;
}

@Controller()
export class AppController {
  constructor(private readonly graphs: LangGraphRunner) {}

  @Get('graphs/support-workflow')
  invokeSupportWorkflowFromQuery(@Query() query: SupportWorkflowInput) {
    return this.graphs.invoke('support-workflow', normalizeInput(query));
  }

  @Post('graphs/support-workflow')
  invokeSupportWorkflow(@Body() body: SupportWorkflowInput = {}) {
    return this.graphs.invoke('support-workflow', normalizeInput(body));
  }
}

function normalizeInput(input: SupportWorkflowInput) {
  return {
    message:
      typeof input.message === 'string' && input.message.trim().length > 0
        ? input.message.trim()
        : 'Delivery tracking is late for an enterprise customer.',
    customerTier: normalizeTier(input.customerTier),
  };
}

function normalizeTier(tier: string | undefined) {
  if (tier === 'enterprise' || tier === 'pro' || tier === 'free') {
    return tier;
  }

  return 'free';
}
