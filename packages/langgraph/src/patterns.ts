import 'reflect-metadata';

import {
  Command,
  interrupt,
  Send,
  type SendOptions,
} from '@langchain/langgraph';

import { GRAPH_NODE_METADATA } from './constants';
import type {
  CommandNodeOptions,
  GraphCommandOptions,
  GraphCommandTarget,
  GraphCommandUpdate,
  GraphNodeOptions,
  ParentHandoffNodeOptions,
} from './interfaces';

export function commandTo<
  Update extends Record<string, unknown> = Record<string, unknown>,
>(
  to: string | readonly string[],
  options: GraphCommandOptions = {},
): Command<unknown, Update> {
  return new Command({
    update: options.update as Update,
    goto: normalizeGoto(to),
    graph: options.graph,
  });
}

export function parentHandoff<
  Update extends Record<string, unknown> = Record<string, unknown>,
>(
  to: string | readonly string[],
  options: Omit<GraphCommandOptions, 'graph'> = {},
): Command<unknown, Update> {
  return commandTo<Update>(to, {
    ...options,
    graph: Command.PARENT,
  });
}

export function resumeWith<Resume = unknown>(resume: Resume): Command<Resume> {
  return new Command({
    resume,
  });
}

export function sendTo<Node extends string, Args>(
  node: Node,
  args: Args,
  options?: SendOptions,
): Send<Node, Args> {
  return new Send(node, args, options);
}

export function fanOut<Node extends string, Item, Args>(
  node: Node,
  items: readonly Item[],
  mapInput: (item: Item, index: number) => Args,
  options?:
    | SendOptions
    | ((item: Item, index: number) => SendOptions | undefined),
): Array<Send<Node, Args>> {
  return items.map((item, index) =>
    sendTo(
      node,
      mapInput(item, index),
      typeof options === 'function' ? options(item, index) : options,
    ),
  );
}

export function interruptFor<Input = unknown, Resume = unknown>(
  payload: Input,
): Resume {
  return interrupt<Input, Resume>(payload);
}

export function callSubgraph<
  TParentState,
  TChildInput,
  TChildOutput,
  TParentUpdate,
>(
  subgraph: {
    invoke(
      input: TChildInput,
      config?: unknown,
    ): Promise<TChildOutput> | TChildOutput;
  },
  mapInput: (state: TParentState) => TChildInput,
  mapOutput: (output: TChildOutput, state: TParentState) => TParentUpdate,
) {
  return async (
    state: TParentState,
    config?: unknown,
  ): Promise<TParentUpdate> => {
    const input = mapInput(state);
    const output =
      typeof config === 'undefined'
        ? await subgraph.invoke(input)
        : await subgraph.invoke(input, config);

    return mapOutput(output, state);
  };
}

export function CommandNode(options: CommandNodeOptions): MethodDecorator {
  return commandNode(options, options.graph);
}

export function RouteCommandNode(options: CommandNodeOptions): MethodDecorator {
  return commandNode(options, undefined);
}

export function ParentHandoffNode(
  options: ParentHandoffNodeOptions,
): MethodDecorator {
  return commandNode(options, Command.PARENT);
}

function commandNode(
  options: CommandNodeOptions,
  graph: string | undefined,
): MethodDecorator {
  return (_target, propertyKey, descriptor) => {
    const original = descriptor.value;

    if (typeof original !== 'function') {
      throw new Error(`@CommandNode can only decorate methods.`);
    }

    const wrapped = async function (this: unknown, ...args: unknown[]) {
      const result = await original.apply(this, args);

      if (result instanceof Command) {
        return result;
      }

      return commandTo(resolveTarget(options.to, result, args), {
        update: resolveUpdate(options, result, args),
        graph,
      });
    };
    const nodeOptions = graphNodeOptionsFromCommand(
      options,
      propertyKey,
      graph,
    );

    Reflect.defineMetadata(GRAPH_NODE_METADATA, nodeOptions, wrapped);
    descriptor.value = wrapped as never;
  };
}

function graphNodeOptionsFromCommand(
  options: CommandNodeOptions,
  propertyKey: string | symbol,
  graph: string | undefined,
): GraphNodeOptions {
  return {
    name: options.name ?? String(propertyKey),
    ends: options.ends ?? (graph ? undefined : staticTargets(options.to)),
    metadata: options.metadata,
    subgraphs: options.subgraphs,
    defer: options.defer,
    retryPolicy: options.retryPolicy,
    cachePolicy: options.cachePolicy,
    timeout: options.timeout,
  };
}

function resolveTarget(
  target: GraphCommandTarget,
  result: unknown,
  args: unknown[],
): string | readonly string[] {
  return typeof target === 'function' ? target(result, ...args) : target;
}

function resolveUpdate(
  options: CommandNodeOptions,
  result: unknown,
  args: unknown[],
): GraphCommandUpdate {
  if (typeof options.update === 'function') {
    return options.update(result, ...args);
  }

  if (typeof options.update !== 'undefined') {
    return options.update;
  }

  if (typeof result === 'undefined') {
    return undefined;
  }

  return result as GraphCommandUpdate;
}

function normalizeGoto(to: string | readonly string[]): string | string[] {
  return typeof to === 'string' ? to : [...to];
}

function staticTargets(
  target: GraphCommandTarget,
): readonly string[] | undefined {
  if (typeof target === 'function') {
    return undefined;
  }

  return typeof target === 'string' ? [target] : target;
}
