import { defineTypedLangGraph, type TypedLangGraphNodeKey } from '../src';

const support = defineTypedLangGraph({
  name: 'support-intake',
  state: {},
  nodes: {
    classify: 'classifyAndRoute',
    billing: 'handleBilling',
    draft: 'draftResponse',
  },
} as const);

type SupportNodeKey = TypedLangGraphNodeKey<typeof support>;

const validKey: SupportNodeKey = 'classify';

support.node(validKey);
support.edge('classify', 'billing');
support.edges(['classify', 'billing'], ['billing', 'draft']);
support.ends('billing', 'draft');
support.Graph({
  entry: 'classify',
  finish: ['draft'],
  edges: support.edges(['classify', 'billing']),
});
support.Node('classify', {
  entry: true,
  ends: support.ends('billing'),
});
support.ConditionalEdge({
  from: 'classify',
  mapping: {
    routed: 'billing',
  },
});
support.commandTo('billing', {
  update: {
    intent: 'billing',
  },
});
support.commandTo(['billing', 'draft']);
support.sendTo('billing', {
  customerId: 'cus_1',
});
support.fanOut('billing', ['a', 'b'], (item) => ({
  item,
}));
support.RouteCommandNode('classify', {
  to: 'billing',
});

// @ts-expect-error unknown node keys are rejected.
const invalidKey: SupportNodeKey = 'missing';

// @ts-expect-error unknown node keys are rejected by node().
support.node('missing');

// @ts-expect-error unknown edge endpoints are rejected.
support.edge('classify', 'missing');

// @ts-expect-error unknown batch edge endpoints are rejected.
support.edges(['classify', 'missing']);

// @ts-expect-error unknown ends targets are rejected.
support.ends('missing');

// @ts-expect-error unknown graph entry nodes are rejected.
support.Graph({ entry: 'missing' });

// @ts-expect-error unknown graph finish nodes are rejected.
support.Graph({ finish: ['missing'] });

// @ts-expect-error unknown graph edge endpoints are rejected.
support.Graph({ edges: [['classify', 'missing']] });

// @ts-expect-error unknown graph node keys are rejected.
support.Node('missing');

// @ts-expect-error unknown node ends are rejected.
support.Node('classify', { ends: ['missing'] });

// @ts-expect-error unknown conditional edge sources are rejected.
support.ConditionalEdge({ from: 'missing' });

// @ts-expect-error unknown conditional mapping targets are rejected.
support.ConditionalEdge({ from: 'classify', mapping: { routed: 'missing' } });

// @ts-expect-error unknown command targets are rejected.
support.commandTo('missing');

// @ts-expect-error unknown command array targets are rejected.
support.commandTo(['billing', 'missing']);

// @ts-expect-error typed command helpers do not accept remote graph targets.
support.commandTo('billing', { graph: 'remote' });

// @ts-expect-error unknown Send targets are rejected.
support.sendTo('missing', {});

// @ts-expect-error unknown fan-out targets are rejected.
support.fanOut('missing', ['a'], (item) => ({
  item,
}));

// @ts-expect-error unknown RouteCommandNode names are rejected.
support.RouteCommandNode('missing', {
  to: 'billing',
});

// @ts-expect-error unknown RouteCommandNode targets are rejected.
support.RouteCommandNode('classify', { to: 'missing' });
