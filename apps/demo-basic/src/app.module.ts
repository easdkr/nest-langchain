import { Module, OnModuleInit } from '@nestjs/common';
import { LangChainModule, LangChainRegistry } from '@nest-langchain/core';

import { AppController } from './app.controller';

interface SupportTriageInput {
  message: string;
  customerTier: 'free' | 'pro' | 'enterprise';
  channel: string;
}

type SupportIntent =
  | 'billing'
  | 'delivery'
  | 'technical'
  | 'refund'
  | 'general';

@Module({
  imports: [LangChainModule.forRoot({ global: true })],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: LangChainRegistry) {}

  onModuleInit(): void {
    this.registry.registerRunnable(
      'support-triage',
      {
        invoke: (input) => triageSupport(input as SupportTriageInput),
      },
      {
        kind: 'chain',
        nodes: ['normalize', 'classify', 'route'],
        tags: ['demo', 'support'],
        metadata: {
          owner: 'support-platform',
          inputContract: 'SupportTriageInput',
        },
      },
    );
  }
}

function triageSupport(input: SupportTriageInput) {
  const intent = detectIntent(input.message);
  const priority = detectPriority(intent, input.customerTier, input.message);
  const queue = routeQueue(intent, priority);

  return {
    request: input,
    classification: {
      intent,
      priority,
      reason: explainClassification(intent, priority, input.customerTier),
    },
    routing: {
      queue,
      slaMinutes: priority === 'critical' ? 15 : priority === 'high' ? 60 : 240,
      escalationRequired: priority === 'critical',
    },
    nextActions: nextActions(intent, priority),
    handledBy: '@nest-langchain/core',
  };
}

function detectIntent(message: string): SupportIntent {
  const lower = message.toLowerCase();

  if (matchesAny(lower, ['invoice', 'payment', 'card', 'billing', 'charge'])) {
    return 'billing';
  }

  if (matchesAny(lower, ['delivery', 'shipment', 'tracking', 'late'])) {
    return 'delivery';
  }

  if (matchesAny(lower, ['refund', 'return', 'cancel'])) {
    return 'refund';
  }

  if (matchesAny(lower, ['error', 'fail', 'bug', 'cannot', 'broken'])) {
    return 'technical';
  }

  return 'general';
}

function detectPriority(
  intent: SupportIntent,
  tier: SupportTriageInput['customerTier'],
  message: string,
) {
  const lower = message.toLowerCase();

  if (
    tier === 'enterprise' &&
    matchesAny(lower, ['down', 'outage', 'blocked'])
  ) {
    return 'critical';
  }

  if (tier === 'enterprise' || intent === 'billing' || intent === 'technical') {
    return 'high';
  }

  if (intent === 'refund' || intent === 'delivery') {
    return 'medium';
  }

  return 'low';
}

function routeQueue(intent: SupportIntent, priority: string) {
  if (priority === 'critical') {
    return 'support-escalation';
  }

  return `support-${intent}`;
}

function nextActions(intent: SupportIntent, priority: string) {
  const actions = [
    'attach_customer_context',
    `open_${routeQueue(intent, priority)}_ticket`,
  ];

  if (priority === 'critical') {
    actions.push('page_on_call_owner');
  }

  return actions;
}

function explainClassification(
  intent: SupportIntent,
  priority: string,
  tier: SupportTriageInput['customerTier'],
) {
  return `${intent} intent routed as ${priority} priority for ${tier} customer`;
}

function matchesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
