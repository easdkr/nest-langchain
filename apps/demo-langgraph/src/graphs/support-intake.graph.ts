import { Annotation } from '@langchain/langgraph';

import {
  callSubgraph,
  commandTo,
  ConditionalEdge,
  fanOut,
  GraphNode,
  interruptFor,
  LangGraph,
  sendTo,
} from '@nest-langchain/langgraph';
import { LangGraphRunner } from '@nest-langchain/langgraph';
import { TraceableRun } from '@nest-langchain/langsmith';

import { SupportDraftService } from '../support-draft.service';
import type {
  ApprovalDecision,
  ApprovalInterruptPayload,
  CustomerTier,
  ReviewArea,
  SupportIntent,
  SupportPolicyInput,
  SupportPolicyResult,
  SupportPriority,
} from '../support-types';

const SupportIntakeState = Annotation.Root({
  message: Annotation<string>(),
  customerTier: Annotation<CustomerTier>(),
  channel: Annotation<string>(),
  approvalRequired: Annotation<boolean>(),
  intent: Annotation<SupportIntent>(),
  priority: Annotation<SupportPriority>(),
  routingKey: Annotation<string>(),
  reviewAreas: Annotation<ReviewArea[]>(),
  reviewArea: Annotation<ReviewArea>(),
  reviewNotes: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  policy: Annotation<SupportPolicyResult>(),
  approval: Annotation<ApprovalDecision>(),
  provider: Annotation<string>(),
  response: Annotation<string>(),
});

type SupportIntakeGraphState = typeof SupportIntakeState.State;

interface SupportPolicyGraphOutput {
  queue: string;
  summary: string;
  requiredReviews: ReviewArea[];
}

@LangGraph({
  name: 'support-intake',
  state: SupportIntakeState,
  edges: [
    ['handleBilling', 'loadPolicy'],
    ['handleDelivery', 'loadPolicy'],
    ['handleTechnical', 'loadPolicy'],
    ['handleRefund', 'loadPolicy'],
    ['handleGeneral', 'loadPolicy'],
    ['loadPolicy', 'planReviews'],
    ['runReview', 'approvalGate'],
    ['approvalGate', 'draftResponse'],
  ],
  tags: ['demo', 'support', 'command', 'human-in-the-loop'],
  metadata: {
    owner: 'support-platform',
    scenario: 'customer-support-intake',
  },
})
export class SupportIntakeGraph {
  constructor(
    private readonly graphs: LangGraphRunner,
    private readonly drafts: SupportDraftService,
  ) {}

  @GraphNode({
    entry: true,
    ends: [
      'handleBilling',
      'handleDelivery',
      'handleTechnical',
      'handleRefund',
      'handleGeneral',
    ],
    metadata: {
      description: 'Classify customer intent and route with Command.',
    },
  })
  @TraceableRun({
    name: 'Classify and route support request',
    runType: 'chain',
    tags: ['classify', 'command'],
  })
  classifyAndRoute(state: SupportIntakeGraphState) {
    const intent = detectIntent(state.message);
    const priority = detectPriority(intent, state.customerTier, state.message);
    const routingKey =
      priority === 'critical' ? 'support-escalation' : `support-${intent}`;

    return commandTo(routeNodeForIntent(intent), {
      update: {
        intent,
        priority,
        routingKey,
      },
    });
  }

  @GraphNode()
  handleBilling() {
    return {
      reviewAreas: ['account', 'policy'] satisfies ReviewArea[],
    };
  }

  @GraphNode()
  handleDelivery() {
    return {
      reviewAreas: ['logistics', 'policy'] satisfies ReviewArea[],
    };
  }

  @GraphNode()
  handleTechnical() {
    return {
      reviewAreas: ['engineering', 'policy'] satisfies ReviewArea[],
    };
  }

  @GraphNode()
  handleRefund() {
    return {
      reviewAreas: ['account', 'policy'] satisfies ReviewArea[],
    };
  }

  @GraphNode()
  handleGeneral() {
    return {
      reviewAreas: ['policy'] satisfies ReviewArea[],
    };
  }

  @GraphNode({
    metadata: {
      description: 'Call the support-policy subgraph with explicit mapping.',
    },
  })
  async loadPolicy(state: SupportIntakeGraphState, config?: unknown) {
    const loadPolicy = callSubgraph<
      SupportIntakeGraphState,
      SupportPolicyInput,
      SupportPolicyGraphOutput,
      Partial<SupportIntakeGraphState>
    >(
      {
        invoke: (input, subgraphConfig) =>
          this.graphs.invoke<SupportPolicyInput, SupportPolicyGraphOutput>(
            'support-policy',
            input,
            withPolicyThread(subgraphConfig),
          ),
      },
      (parentState) => ({
        intent: parentState.intent,
        priority: parentState.priority,
        routingKey: parentState.routingKey,
        customerTier: parentState.customerTier,
      }),
      (policyState, parentState) => {
        const policy: SupportPolicyResult = {
          queue: policyState.queue,
          summary: policyState.summary,
          requiredReviews: policyState.requiredReviews,
        };

        return {
          policy,
          reviewAreas: uniqueReviewAreas([
            ...parentState.reviewAreas,
            ...policy.requiredReviews,
          ]),
        };
      },
    );

    return loadPolicy(state, config);
  }

  @GraphNode({
    metadata: {
      description: 'Prepare dynamic review workers.',
    },
  })
  planReviews(state: SupportIntakeGraphState) {
    return {
      reviewAreas: uniqueReviewAreas(state.reviewAreas),
    };
  }

  @ConditionalEdge({
    from: 'planReviews',
  })
  routeReviewAreas(state: SupportIntakeGraphState) {
    const reviewAreas = uniqueReviewAreas(state.reviewAreas);

    if (reviewAreas.length === 1) {
      return [sendTo('runReview', reviewInput(state, reviewAreas[0]))];
    }

    return fanOut('runReview', reviewAreas, (reviewArea) =>
      reviewInput(state, reviewArea),
    );
  }

  @GraphNode({
    name: 'runReview',
    metadata: {
      description: 'Run one review worker selected by Send fan-out.',
    },
  })
  runReview(state: SupportIntakeGraphState) {
    return {
      reviewNotes: [reviewNoteFor(state.reviewArea, state)],
    };
  }

  @GraphNode({
    metadata: {
      description: 'Pause high-risk requests for human approval.',
    },
  })
  approvalGate(state: SupportIntakeGraphState) {
    if (
      state.approvalRequired ||
      state.priority === 'high' ||
      state.priority === 'critical'
    ) {
      const decision = interruptFor<ApprovalInterruptPayload, ApprovalDecision>(
        {
          action: 'approve_support_response',
          message: state.message,
          routingKey: state.routingKey,
          priority: state.priority,
          policySummary: state.policy.summary,
          reviewNotes: state.reviewNotes,
        },
      );

      return {
        approval: normalizeApprovalDecision(decision),
      };
    }

    return {
      approval: {
        approved: true,
        reviewer: 'system',
        note: 'Auto-approved because the request is not high risk.',
      },
    };
  }

  @GraphNode({
    finish: true,
    metadata: {
      description: 'Draft the operator-facing response.',
    },
  })
  @TraceableRun({
    name: 'Draft support response',
    runType: 'chain',
    tags: ['respond'],
  })
  async draftResponse(state: SupportIntakeGraphState) {
    const draft = await this.drafts.draft({
      message: state.message,
      routingKey: state.routingKey,
      priority: state.priority,
      policySummary: state.policy.summary,
      reviewNotes: state.reviewNotes,
      approvalNote: state.approval.note,
    });

    return {
      provider: draft.provider,
      response: draft.response,
    };
  }
}

function detectIntent(message: string): SupportIntent {
  const lower = message.toLowerCase();

  if (
    matchesAny(lower, [
      'checkout',
      'invoice',
      'payment',
      'card',
      'billing',
      'charge',
    ])
  ) {
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

function routeNodeForIntent(intent: SupportIntent): string {
  const routes: Record<SupportIntent, string> = {
    billing: 'handleBilling',
    delivery: 'handleDelivery',
    technical: 'handleTechnical',
    refund: 'handleRefund',
    general: 'handleGeneral',
  };

  return routes[intent];
}

function reviewNoteFor(
  reviewArea: ReviewArea | undefined,
  state: SupportIntakeGraphState,
): string {
  const area = reviewArea ?? 'policy';
  const notes: Record<ReviewArea, string> = {
    account: `account review complete for ${state.routingKey}`,
    engineering: `engineering review complete for ${state.routingKey}`,
    incident: `incident review complete for ${state.routingKey}`,
    logistics: `logistics review complete for ${state.routingKey}`,
    policy: `policy review complete for ${state.policy.queue}`,
  };

  return notes[area];
}

function reviewInput(
  state: SupportIntakeGraphState,
  reviewArea: ReviewArea,
): Partial<SupportIntakeGraphState> {
  return {
    message: state.message,
    customerTier: state.customerTier,
    channel: state.channel,
    approvalRequired: state.approvalRequired,
    intent: state.intent,
    priority: state.priority,
    routingKey: state.routingKey,
    policy: state.policy,
    reviewArea,
  };
}

function normalizeApprovalDecision(
  decision: ApprovalDecision,
): ApprovalDecision {
  return {
    approved: decision.approved === true,
    reviewer:
      typeof decision.reviewer === 'string' && decision.reviewer.trim()
        ? decision.reviewer.trim()
        : 'unknown-reviewer',
    note:
      typeof decision.note === 'string' && decision.note.trim()
        ? decision.note.trim()
        : undefined,
  };
}

function uniqueReviewAreas(values: readonly ReviewArea[]): ReviewArea[] {
  return [...new Set(values)];
}

function withPolicyThread(
  config: unknown,
): Record<string, unknown> | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }

  const source = config as {
    configurable?: Record<string, unknown>;
    [key: string]: unknown;
  };
  const threadId = source.configurable?.thread_id;

  return {
    ...source,
    configurable: {
      ...source.configurable,
      thread_id:
        typeof threadId === 'string' && threadId.length > 0
          ? `${threadId}:policy`
          : undefined,
    },
  };
}

function matchesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
