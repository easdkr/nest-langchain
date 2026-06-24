import { Annotation } from '@langchain/langgraph';

import { GraphNode, LangGraph } from '@nest-langchain/langgraph';

import type {
  ReviewArea,
  SupportIntent,
  SupportPolicyResult,
  SupportPriority,
} from '../support-types';

const SupportPolicyState = Annotation.Root({
  intent: Annotation<SupportIntent>(),
  priority: Annotation<SupportPriority>(),
  routingKey: Annotation<string>(),
  queue: Annotation<string>(),
  summary: Annotation<string>(),
  requiredReviews: Annotation<ReviewArea[]>(),
});

@LangGraph({
  name: 'support-policy',
  state: SupportPolicyState,
  tags: ['demo', 'support', 'policy'],
  metadata: {
    owner: 'support-platform',
    scenario: 'policy-lookup',
  },
})
export class SupportPolicyGraph {
  @GraphNode({
    entry: true,
    finish: true,
    metadata: {
      description: 'Resolve queue ownership and review policy.',
    },
  })
  resolvePolicy(state: typeof SupportPolicyState.State) {
    const policy = resolvePolicy(state.intent, state.priority);

    return {
      queue: policy.queue,
      summary: policy.summary,
      requiredReviews: policy.requiredReviews,
    };
  }
}

function resolvePolicy(
  intent: SupportIntent,
  priority: SupportPriority,
): SupportPolicyResult {
  if (priority === 'critical') {
    return {
      queue: 'incident-command',
      summary:
        'Critical incidents route to incident command with account and policy review before customer messaging.',
      requiredReviews: ['incident', 'account', 'policy'],
    };
  }

  const policies: Record<SupportIntent, SupportPolicyResult> = {
    billing: {
      queue: 'billing-operations',
      summary:
        'Billing issues require account ownership validation and payment policy review.',
      requiredReviews: ['account', 'policy'],
    },
    delivery: {
      queue: 'delivery-operations',
      summary:
        'Delivery issues require logistics ownership validation and customer-facing policy review.',
      requiredReviews: ['logistics', 'policy'],
    },
    technical: {
      queue: 'engineering-support',
      summary:
        'Technical issues require engineering triage and customer-facing policy review.',
      requiredReviews: ['engineering', 'policy'],
    },
    refund: {
      queue: 'account-operations',
      summary:
        'Refund requests require account ownership validation and refund policy review.',
      requiredReviews: ['account', 'policy'],
    },
    general: {
      queue: 'frontline-support',
      summary:
        'General questions stay with frontline support and require policy review.',
      requiredReviews: ['policy'],
    },
  };

  return policies[intent];
}
