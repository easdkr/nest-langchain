import { Annotation } from '@langchain/langgraph';
import { GraphNode, LangGraph } from '@nest-langchain/langgraph';

type CustomerTier = 'free' | 'pro' | 'enterprise';
type SupportIntent = 'billing' | 'delivery' | 'technical' | 'general';

const SupportWorkflowState = Annotation.Root({
  message: Annotation<string>(),
  customerTier: Annotation<CustomerTier>(),
  intent: Annotation<SupportIntent>(),
  owner: Annotation<string>(),
  result: Annotation<string>(),
});

@LangGraph({
  name: 'support-workflow',
  state: SupportWorkflowState,
  tags: ['demo', 'visualization', 'support'],
  metadata: {
    owner: 'support-platform',
  },
})
export class SupportWorkflowGraph {
  @GraphNode({ entry: true })
  classifyRequest(state: typeof SupportWorkflowState.State) {
    return {
      intent: detectIntent(state.message),
    };
  }

  @GraphNode()
  assignOwner(state: typeof SupportWorkflowState.State) {
    return {
      owner:
        state.customerTier === 'enterprise'
          ? 'enterprise-success'
          : `support-${state.intent}`,
    };
  }

  @GraphNode({ finish: true })
  draftOperatorSummary(state: typeof SupportWorkflowState.State) {
    return {
      result: [
        `Owner: ${state.owner}.`,
        `Intent: ${state.intent}.`,
        `Message: ${state.message}`,
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

  if (matchesAny(lower, ['error', 'fail', 'bug', 'cannot', 'broken'])) {
    return 'technical';
  }

  return 'general';
}

function matchesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
