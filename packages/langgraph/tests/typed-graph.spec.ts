import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { Annotation, END, Send, START } from '@langchain/langgraph';
import { LangChainRegistry } from '@nest-langchain/core';
import { describe, expect, it } from 'vitest';

import {
  defineTypedLangGraph,
  GraphNode,
  LangGraph,
  LangGraphModule,
} from '../src';
import {
  CONDITIONAL_EDGE_METADATA,
  GRAPH_NODE_METADATA,
} from '../src/constants';

const StaticState = Annotation.Root({
  value: Annotation<string>(),
});

const staticGraph = defineTypedLangGraph({
  name: 'typed-static',
  state: StaticState,
  nodes: {
    start: 'startRuntime',
    finish: 'finishRuntime',
  },
} as const);

@staticGraph.Graph({
  edges: staticGraph.edges(['start', 'finish']),
})
class TypedStaticGraph {
  @staticGraph.Node('start', {
    entry: true,
  })
  start() {
    return {
      value: 'typed',
    };
  }

  @staticGraph.Node('finish', {
    finish: true,
  })
  finish(state: typeof StaticState.State) {
    return state;
  }
}

@LangGraph({
  name: 'raw-static',
  state: StaticState,
  edges: [['startRuntime', 'finishRuntime']],
})
class RawStaticGraph {
  @GraphNode({
    name: 'startRuntime',
    entry: true,
  })
  start() {
    return {
      value: 'raw',
    };
  }

  @GraphNode({
    name: 'finishRuntime',
    finish: true,
  })
  finish(state: typeof StaticState.State) {
    return state;
  }
}

const CommandState = Annotation.Root({
  approved: Annotation<boolean>(),
  output: Annotation<string>(),
});

const commandGraph = defineTypedLangGraph({
  name: 'typed-command',
  state: CommandState,
  nodes: {
    decide: 'decideRuntime',
    approved: 'approvedRuntime',
    rejected: 'rejectedRuntime',
  },
} as const);

@commandGraph.Graph({
  edges: [],
})
class TypedCommandGraph {
  @commandGraph.Node('decide', {
    entry: true,
    ends: commandGraph.ends('approved', 'rejected'),
  })
  decide(state: typeof CommandState.State) {
    return commandGraph.commandTo(state.approved ? 'approved' : 'rejected', {
      update: {
        output: 'routed',
      },
    });
  }

  @commandGraph.Node('approved', {
    finish: true,
  })
  approved(state: typeof CommandState.State) {
    return {
      output: `${state.output}:approved`,
    };
  }

  @commandGraph.Node('rejected', {
    finish: true,
  })
  rejected(state: typeof CommandState.State) {
    return {
      output: `${state.output}:rejected`,
    };
  }
}

const fanOutGraph = defineTypedLangGraph({
  name: 'typed-fanout',
  state: StaticState,
  nodes: {
    reviews: 'reviewsRuntime',
    reviewWorker: 'reviewWorkerRuntime',
    draft: 'draftRuntime',
  },
} as const);

class TypedFanOutRoutes {
  @fanOutGraph.ConditionalEdge({
    from: 'reviews',
    mapping: {
      done: 'draft',
    },
  })
  routeReviewAreas(state: { reviewAreas: readonly string[] }) {
    return fanOutGraph.fanOut('reviewWorker', state.reviewAreas, (area) => ({
      area,
    }));
  }
}

const routeNodeGraph = defineTypedLangGraph({
  name: 'typed-route-node',
  state: StaticState,
  nodes: {
    route: 'routeRuntime',
    draft: 'draftRuntime',
  },
} as const);

class TypedRouteCommandNodes {
  @routeNodeGraph.RouteCommandNode('route', {
    entry: true,
    to: 'draft',
  })
  route() {
    return {
      output: 'typed',
    };
  }
}

describe('defineTypedLangGraph', () => {
  it('compiles typed static edges into the same registered edges as raw LangGraph metadata', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [TypedStaticGraph, RawStaticGraph],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    expect(registry.getGraph('typed-static').edges).toEqual(
      registry.getGraph('raw-static').edges,
    );
    expect(registry.getGraph('typed-static').edges).toEqual([
      [START, 'startRuntime'],
      ['startRuntime', 'finishRuntime'],
      ['finishRuntime', END],
    ]);

    await moduleRef.close();
  });

  it('converts typed node ends and commandTo targets before runtime routing', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [TypedCommandGraph],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    await expect(
      registry.invokeGraph<
        { approved: boolean; output: string },
        { output: string }
      >('typed-command', {
        approved: true,
        output: '',
      }),
    ).resolves.toMatchObject({
      output: 'routed:approved',
    });

    expect(registry.getGraph('typed-command').edges).toContainEqual([
      'decideRuntime',
      'approvedRuntime',
    ]);
    expect(registry.getGraph('typed-command').edges).toContainEqual([
      'decideRuntime',
      'rejectedRuntime',
    ]);

    await moduleRef.close();
  });

  it('converts conditional edge metadata and Send fan-out targets', () => {
    const routes = new TypedFanOutRoutes();
    const prototype = Object.getPrototypeOf(routes);
    const sends = routes.routeReviewAreas({
      reviewAreas: ['legal', 'risk'],
    });

    expect(
      Reflect.getMetadata(
        CONDITIONAL_EDGE_METADATA,
        prototype.routeReviewAreas,
      ),
    ).toEqual({
      from: 'reviewsRuntime',
      mapping: {
        done: 'draftRuntime',
      },
    });
    expect(sends).toHaveLength(2);
    expect(sends[0]).toBeInstanceOf(Send);
    expect(sends[0]).toMatchObject({
      node: 'reviewWorkerRuntime',
      args: {
        area: 'legal',
      },
    });
  });

  it('sets RouteCommandNode graph-node metadata and command targets with real node names', async () => {
    const nodes = new TypedRouteCommandNodes();
    const prototype = Object.getPrototypeOf(nodes);

    await expect(nodes.route()).resolves.toMatchObject({
      goto: ['draftRuntime'],
      update: {
        output: 'typed',
      },
    });
    expect(Reflect.getMetadata(GRAPH_NODE_METADATA, prototype.route)).toEqual({
      name: 'routeRuntime',
      entry: true,
      finish: undefined,
      ends: ['draftRuntime'],
      metadata: undefined,
      subgraphs: undefined,
      defer: undefined,
      retryPolicy: undefined,
      cachePolicy: undefined,
      timeout: undefined,
    });
  });
});
