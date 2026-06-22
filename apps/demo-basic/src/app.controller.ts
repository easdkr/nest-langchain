import { Body, Controller, Get, Post } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

interface SupportTriageBody {
  message?: string;
  customerTier?: string;
  channel?: string;
}

@Controller()
export class AppController {
  constructor(private readonly registry: LangChainRegistry) {}

  @Get('runnables')
  listRunnables() {
    return this.registry.listRunnables();
  }

  @Post('support/triage')
  triageSupport(@Body() body: SupportTriageBody = {}) {
    return this.registry.invoke('support-triage', normalizeSupportInput(body));
  }
}

function normalizeSupportInput(input: SupportTriageBody) {
  return {
    message:
      typeof input.message === 'string' && input.message.trim().length > 0
        ? input.message.trim()
        : 'Cannot complete checkout with my saved card.',
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
