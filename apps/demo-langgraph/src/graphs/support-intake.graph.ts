import { Annotation } from '@langchain/langgraph';

import { GraphNode, LangGraph } from '@nest-langchain/langgraph';
import { TraceableRun } from '@nest-langchain/langsmith';

type CustomerTier = 'free' | 'pro' | 'enterprise';
type SupportIntent =
  | 'billing'
  | 'delivery'
  | 'technical'
  | 'refund'
  | 'general';
type SupportPriority = 'low' | 'medium' | 'high' | 'critical';

const SupportIntakeState = Annotation.Root({
  message: Annotation<string>(),
  customerTier: Annotation<CustomerTier>(),
  channel: Annotation<string>(),
  intent: Annotation<SupportIntent>(),
  priority: Annotation<SupportPriority>(),
  routingKey: Annotation<string>(),
  response: Annotation<string>(),
});

@LangGraph({
  name: 'support-intake',
  state: SupportIntakeState,
  tags: ['demo', 'support'],
  metadata: {
    owner: 'support-platform',
    scenario: 'customer-support-intake',
  },
})
export class SupportIntakeGraph {
  @GraphNode({
    entry: true,
    metadata: {
      description: 'Classify customer intent and priority.',
    },
  })
  @TraceableRun({
    name: 'Classify support request',
    runType: 'chain',
    tags: ['classify'],
  })
  classifyRequest(state: typeof SupportIntakeState.State) {
    const intent = detectIntent(state.message);
    const priority = detectPriority(intent, state.customerTier, state.message);

    return {
      intent,
      priority,
      routingKey:
        priority === 'critical' ? 'support-escalation' : `support-${intent}`,
    };
  }

  @GraphNode({
    finish: true,
    metadata: {
      description: 'Prepare an operator-facing first response.',
    },
  })
  @TraceableRun({
    name: 'Draft support response',
    runType: 'parser',
    tags: ['respond'],
  })
  draftResponse(state: typeof SupportIntakeState.State) {
    return {
      response: [
        `Route to ${state.routingKey}.`,
        `Treat as ${state.priority} priority ${state.intent} request.`,
        `Customer channel: ${state.channel}.`,
      ].join(' '),
    };
  }
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
  tier: CustomerTier,
  message: string,
): SupportPriority {
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

function matchesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
