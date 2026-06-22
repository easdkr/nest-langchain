import { Injectable } from '@nestjs/common';
import { TraceableRun } from '@nest-langchain/langsmith';

export interface TraceDemoInput {
  message: string;
  accountId: string;
}

@Injectable()
export class TraceDemoHandler {
  @TraceableRun({
    name: 'Summarize support case',
    runType: 'chain',
    tags: ['demo', 'langsmith', 'support'],
  })
  async handle(input: TraceDemoInput) {
    const normalizedMessage = normalizeMessage(input.message);
    const intent = detectIntent(normalizedMessage);

    return {
      accountId: redactAccountId(input.accountId),
      normalizedMessage,
      intent,
      summary: `Support case for ${intent}: ${normalizedMessage}`,
      tracing: {
        package: '@nest-langchain/langsmith',
        redaction: 'accountId is masked before returning the response',
      },
    };
  }
}

function normalizeMessage(message: string) {
  return message.replace(/\s+/g, ' ').trim();
}

function detectIntent(message: string) {
  const lower = message.toLowerCase();

  if (matchesAny(lower, ['invoice', 'payment', 'card', 'billing', 'charge'])) {
    return 'billing';
  }

  if (matchesAny(lower, ['delivery', 'shipment', 'tracking', 'late'])) {
    return 'delivery';
  }

  if (matchesAny(lower, ['error', 'fail', 'bug', 'cannot', 'broken'])) {
    return 'technical';
  }

  return 'general';
}

function redactAccountId(accountId: string) {
  if (accountId.length <= 6) {
    return '***';
  }

  return `${accountId.slice(0, 4)}...${accountId.slice(-2)}`;
}

function matchesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
