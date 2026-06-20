import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Annotation, Command, Send } from '@langchain/langgraph';
import { LangChainRegistry } from '@nest-langchain/core';
import { describe, expect, it, vi } from 'vitest';

import {
  callSubgraph,
  CommandNode,
  commandTo,
  fanOut,
  GraphNode,
  interruptFor,
  LangGraph,
  LangGraphModule,
  ParentHandoffNode,
  parentHandoff,
  resumeWith,
  RouteCommandNode,
  sendTo,
} from '../src';
import { GRAPH_NODE_METADATA } from '../src/constants';

const RouteState = Annotation.Root({
  approved: Annotation<boolean>(),
  output: Annotation<string>(),
});

@LangGraph({
  name: 'command-route',
  state: RouteState,
  entry: 'decide',
  finish: ['approvedPath', 'rejectedPath'],
  edges: [],
})
@Injectable()
class CommandRouteGraph {
  @GraphNode({
    ends: ['approvedPath', 'rejectedPath'],
  })
  decide(state: typeof RouteState.State) {
    return commandTo(state.approved ? 'approvedPath' : 'rejectedPath', {
      update: {
        output: 'routed',
      },
    });
  }

  @GraphNode()
  approvedPath(state: typeof RouteState.State) {
    return {
      output: `${state.output}:approved`,
    };
  }

  @GraphNode()
  rejectedPath(state: typeof RouteState.State) {
    return {
      output: `${state.output}:rejected`,
    };
  }
}

class DecoratedCommandNodes {
  @CommandNode({
    name: 'remoteRoute',
    to: 'remoteNode',
    graph: 'remoteGraph',
  })
  remoteRoute() {
    return {
      output: 'remote',
    };
  }

  @RouteCommandNode({
    name: 'route',
    to: 'next',
  })
  route() {
    return {
      output: 'local',
    };
  }

  @ParentHandoffNode({
    name: 'escalate',
    to: 'supervisor',
  })
  escalate() {
    return {
      reason: 'needs-supervisor',
    };
  }
}

describe('LangGraph patterns', () => {
  it('creates Command, parent handoff, resume, Send, fan-out, interrupt, and subgraph helpers', async () => {
    const route = commandTo('review', {
      update: {
        status: 'ready',
      },
    });
    const parent = parentHandoff('supervisor', {
      update: {
        reason: 'tool-failed',
      },
    });
    const resume = resumeWith({ approved: true });
    const singleSend = sendTo('worker', { section: 'intro' });
    const sends = fanOut('worker', ['intro', 'api'], (section) => ({
      section,
    }));
    const subgraph = {
      invoke: vi.fn(async (input: { childInput: string }) => ({
        childOutput: `${input.childInput}:done`,
      })),
    };
    const wrappedSubgraph = callSubgraph(
      subgraph,
      (state: { parentInput: string }) => ({
        childInput: state.parentInput,
      }),
      (output) => ({
        parentOutput: output.childOutput,
      }),
    );

    expect(route).toBeInstanceOf(Command);
    expect(route).toMatchObject({
      goto: ['review'],
      update: {
        status: 'ready',
      },
    });
    expect(parent).toBeInstanceOf(Command);
    expect(parent).toMatchObject({
      graph: Command.PARENT,
      goto: ['supervisor'],
      update: {
        reason: 'tool-failed',
      },
    });
    expect(resume).toBeInstanceOf(Command);
    expect(resume).toMatchObject({
      resume: {
        approved: true,
      },
    });
    expect(singleSend).toBeInstanceOf(Send);
    expect(singleSend).toMatchObject({
      node: 'worker',
      args: {
        section: 'intro',
      },
    });
    expect(sends).toHaveLength(2);
    expect(sends[1]).toMatchObject({
      node: 'worker',
      args: {
        section: 'api',
      },
    });
    expect(interruptFor).toEqual(expect.any(Function));
    await expect(
      wrappedSubgraph({
        parentInput: 'parent',
      }),
    ).resolves.toEqual({
      parentOutput: 'parent:done',
    });
    expect(subgraph.invoke).toHaveBeenCalledWith({
      childInput: 'parent',
    });
  });

  it('passes GraphNode ends to LangGraph and runs command-routed nodes without static edges', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LangGraphModule.forRoot()],
      providers: [CommandRouteGraph],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);

    await expect(
      registry.invokeGraph<
        { approved: boolean; output: string },
        { output: string }
      >('command-route', {
        approved: true,
        output: '',
      }),
    ).resolves.toMatchObject({
      output: 'routed:approved',
    });

    expect(registry.getGraph('command-route').edges).toContainEqual([
      'decide',
      'approvedPath',
    ]);
    expect(registry.getGraph('command-route').edges).toContainEqual([
      'decide',
      'rejectedPath',
    ]);

    await moduleRef.close();
  });

  it('wraps route and parent handoff command nodes as decorators', async () => {
    const nodes = new DecoratedCommandNodes();
    const prototype = Object.getPrototypeOf(nodes);

    await expect(nodes.remoteRoute()).resolves.toMatchObject({
      graph: 'remoteGraph',
      goto: ['remoteNode'],
      update: {
        output: 'remote',
      },
    });
    await expect(nodes.route()).resolves.toMatchObject({
      goto: ['next'],
      update: {
        output: 'local',
      },
    });
    await expect(nodes.escalate()).resolves.toMatchObject({
      graph: Command.PARENT,
      goto: ['supervisor'],
      update: {
        reason: 'needs-supervisor',
      },
    });
    expect(
      Reflect.getMetadata(GRAPH_NODE_METADATA, prototype.route),
    ).toMatchObject({
      name: 'route',
      ends: ['next'],
    });
    expect(
      Reflect.getMetadata(GRAPH_NODE_METADATA, prototype.remoteRoute).ends,
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GRAPH_NODE_METADATA, prototype.escalate).ends,
    ).toBeUndefined();
  });
});
