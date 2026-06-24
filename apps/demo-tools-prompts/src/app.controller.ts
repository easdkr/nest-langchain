import { Body, Controller, Get, Post } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';
import { PromptRegistry } from '@nest-langchain/prompts';

interface SupportReplyBody {
  customer?: string;
  topic?: string;
  tone?: string;
}

interface SupportPriorityBody {
  message?: string;
  tier?: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly prompts: PromptRegistry,
    private readonly registry: LangChainRegistry,
  ) {}

  @Get('prompts')
  listPrompts() {
    return this.prompts.listPrompts();
  }

  @Post('prompts/support-reply')
  async formatSupportReply(@Body() body: SupportReplyBody = {}) {
    return {
      prompt: await this.prompts.format(
        'support.reply',
        normalizeSupportReply(body),
      ),
    };
  }

  @Get('tools')
  listTools() {
    return this.registry
      .listRunnables()
      .filter((runnable) => runnable.kind === 'tool');
  }

  @Post('tools/support-priority')
  async classifyPriority(@Body() body: SupportPriorityBody = {}) {
    const output = await this.registry.invoke(
      'support_priority',
      normalizeSupportPriority(body),
    );

    return {
      result: JSON.parse(String(output)) as unknown,
    };
  }
}

function normalizeSupportReply(input: SupportReplyBody) {
  return {
    customer: normalizeString(input.customer, 'Acme'),
    topic: normalizeString(input.topic, 'checkout card failure'),
    tone: normalizeString(input.tone, 'concise'),
  };
}

function normalizeSupportPriority(input: SupportPriorityBody) {
  return {
    message: normalizeString(input.message, 'Customer checkout is blocked.'),
    tier: normalizeTier(input.tier),
  };
}

function normalizeString(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeTier(tier: string | undefined) {
  if (tier === 'enterprise' || tier === 'pro' || tier === 'free') {
    return tier;
  }

  return 'free';
}
