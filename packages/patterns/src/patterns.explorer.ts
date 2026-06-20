import { Inject, Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { DiscoveryService, ModuleRef, Reflector } from "@nestjs/core";
import { tool } from "@langchain/core/tools";
import { LangChainRegistry, type RunnableEdge } from "@nest-langchain/core";

import {
  COLLABORATIVE_TASK_METADATA,
  DEEP_AGENT_METADATA,
  DEEP_AGENT_SUBAGENT_METADATA,
  DEEP_AGENT_TOOL_METADATA,
  PATTERNS_MODULE_OPTIONS,
  TASK_STEP_METADATA,
} from "./constants";
import type {
  CollaborativePatternsModuleOptions,
  CollaborativeTaskOptions,
  DeepAgentOptions,
  DeepAgentSubagentOptions,
  DeepAgentToolOptions,
  ProviderToken,
  RunnableModelLike,
  TaskModelBinding,
  TaskStepOptions,
} from "./interfaces";
import { PatternsService } from "./patterns.service";
import { CollaborativeTaskRunner, type DiscoveredStep } from "./task-runner";

@Injectable()
export class PatternsExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly registry: LangChainRegistry,
    private readonly patterns: PatternsService,
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(PATTERNS_MODULE_OPTIONS)
    private readonly options: CollaborativePatternsModuleOptions = {},
  ) {}

  async onModuleInit(): Promise<void> {
    for (const wrapper of this.discoveryService.getProviders()) {
      const instance = wrapper.instance as Record<string, unknown> | undefined;

      if (!instance) {
        continue;
      }

      if (this.options.autoDiscoverTasks !== false) {
        this.registerCollaborativeTask(instance);
      }

      if (this.options.autoDiscoverDeepAgents !== false) {
        await this.registerDeepAgent(instance);
      }
    }
  }

  private registerCollaborativeTask(instance: Record<string, unknown>): void {
    const taskOptions = this.reflector.get<CollaborativeTaskOptions>(
      COLLABORATIVE_TASK_METADATA,
      instance.constructor,
    );

    if (!taskOptions) {
      return;
    }

    const taskName = taskOptions.name ?? instance.constructor.name;
    const steps = this.discoverSteps(instance);
    const models = this.resolveModels(taskOptions.models);
    const runner = new CollaborativeTaskRunner(
      taskName,
      taskOptions,
      steps,
      models,
    );
    const edges = taskEdges(steps);

    this.registry.registerRunnable({
      name: taskName,
      kind: "chain",
      runnable: runner,
      nodes: steps.map((step) => step.name),
      edges,
      tags: taskOptions.tags ?? [],
      metadata: {
        ...taskOptions.metadata,
        description: taskOptions.description,
        source: "patterns",
        models: taskOptions.models.map((model) => model.role),
      },
    });
    this.patterns.addTask({
      name: taskName,
      description: taskOptions.description,
      nodes: steps.map((step) => step.name),
      edges,
      models: taskOptions.models.map((model) => model.role),
      tags: taskOptions.tags ?? [],
      metadata: taskOptions.metadata ?? {},
    });
  }

  private async registerDeepAgent(
    instance: Record<string, unknown>,
  ): Promise<void> {
    const agentOptions = this.reflector.get<DeepAgentOptions>(
      DEEP_AGENT_METADATA,
      instance.constructor,
    );

    if (!agentOptions) {
      return;
    }

    const agentName = agentOptions.name ?? instance.constructor.name;
    const tools = this.discoverDeepAgentTools(instance);
    const subagents = this.discoverDeepAgentSubagents(
      instance,
      agentOptions,
      tools,
    );
    const createOptions = {
      ...(agentOptions.createOptions ?? {}),
      name: agentName,
      model: agentOptions.model
        ? this.resolveModel(agentOptions.models ?? [], agentOptions.model)
        : undefined,
      tools: filterNamed(tools, agentOptions.tools),
      systemPrompt: agentOptions.systemPrompt,
      subagents: filterNamed(subagents, agentOptions.subagents),
      skills: agentOptions.skills,
      contextSchema: agentOptions.contextSchema,
      responseFormat: agentOptions.responseFormat,
      streamTransformers: agentOptions.streamTransformers,
      interruptOn: agentOptions.interruptOn,
      permissions: agentOptions.permissions,
      middleware: agentOptions.middleware,
      backend: agentOptions.backend ?? agentOptions.filesystem,
      memory: agentOptions.memory,
      checkpointer: agentOptions.checkpointer,
      store: agentOptions.store,
    };
    const { createDeepAgent } = await import("deepagents");
    const runnable = createDeepAgent(removeUndefined(createOptions) as never);
    const nodes = [
      ...tools.map((item) => item.name),
      ...subagents.map((item) => item.name),
    ];

    this.registry.registerGraph({
      name: agentName,
      kind: "graph",
      runnable,
      nodes,
      edges: [],
      tags: agentOptions.tags ?? [],
      metadata: {
        ...agentOptions.metadata,
        description: agentOptions.description,
        source: "deepagents",
        models: (agentOptions.models ?? []).map((model) => model.role),
        tools: tools.map((item) => item.name),
        subagents: subagents.map((item) => item.name),
      },
    });
    this.patterns.addDeepAgent({
      name: agentName,
      description: agentOptions.description,
      nodes,
      models: (agentOptions.models ?? []).map((model) => model.role),
      tools: tools.map((item) => item.name),
      subagents: subagents.map((item) => item.name),
      tags: agentOptions.tags ?? [],
      metadata: agentOptions.metadata ?? {},
    });
  }

  private discoverSteps(instance: Record<string, unknown>): DiscoveredStep[] {
    return methodNames(instance).flatMap((methodName) => {
      const method = Object.getPrototypeOf(instance)[methodName];
      const options = this.reflector.get<TaskStepOptions>(
        TASK_STEP_METADATA,
        method,
      );
      const handler = instance[methodName];

      if (!options || typeof handler !== "function") {
        return [];
      }

      return [
        {
          name: options.name ?? methodName,
          methodName,
          options,
          handler: handler.bind(instance),
        },
      ];
    });
  }

  private discoverDeepAgentTools(instance: Record<string, unknown>) {
    return methodNames(instance).flatMap((methodName) => {
      const method = Object.getPrototypeOf(instance)[methodName];
      const options = this.reflector.get<DeepAgentToolOptions>(
        DEEP_AGENT_TOOL_METADATA,
        method,
      );
      const handler = instance[methodName];

      if (!options || typeof handler !== "function") {
        return [];
      }

      return [
        {
          name: options.name,
          tool: tool(handler.bind(instance), {
            ...options,
            description: options.description ?? `${options.name} tool`,
          } as never) as unknown as Record<string, unknown>,
        },
      ];
    });
  }

  private discoverDeepAgentSubagents(
    instance: Record<string, unknown>,
    agentOptions: DeepAgentOptions,
    tools: Array<{ name: string; tool: Record<string, unknown> }>,
  ) {
    return methodNames(instance).flatMap((methodName) => {
      const method = Object.getPrototypeOf(instance)[methodName];
      const options = this.reflector.get<DeepAgentSubagentOptions>(
        DEEP_AGENT_SUBAGENT_METADATA,
        method,
      );

      if (!options) {
        return [];
      }

      return [
        removeUndefined({
          name: options.name,
          description: options.description,
          systemPrompt: options.systemPrompt,
          model: options.model
            ? this.resolveModel(agentOptions.models ?? [], options.model)
            : undefined,
          tools: filterNamed(tools, options.tools),
          skills: options.skills,
          contextSchema: options.contextSchema,
          responseFormat: options.responseFormat,
          streamTransformers: options.streamTransformers,
          interruptOn: options.interruptOn,
          permissions: options.permissions,
          middleware: options.middleware,
          backend: options.backend,
          memory: options.memory,
          checkpointer: options.checkpointer,
          store: options.store,
          ...(options.createOptions ?? {}),
        }),
      ];
    });
  }

  private resolveModels(
    bindings: TaskModelBinding[],
  ): Record<string, RunnableModelLike> {
    return Object.fromEntries(
      bindings.map((binding) => [binding.role, this.getModel(binding.token)]),
    );
  }

  private resolveModel(
    bindings: TaskModelBinding[],
    role: string,
  ): RunnableModelLike {
    const binding = bindings.find((candidate) => candidate.role === role);

    if (!binding) {
      throw new Error(`Unknown model role "${role}".`);
    }

    return this.getModel(binding.token);
  }

  private getModel(token: ProviderToken): RunnableModelLike {
    return this.moduleRef.get(token, { strict: false }) as RunnableModelLike;
  }
}

function methodNames(instance: Record<string, unknown>): string[] {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
    (key) => key !== "constructor" && typeof instance[key] === "function",
  );
}

function taskEdges(steps: DiscoveredStep[]): RunnableEdge[] {
  return steps.flatMap((step) =>
    (step.options.dependsOn ?? []).map(
      (dependency) => [dependency, step.name] as const,
    ),
  );
}

function filterNamed<T extends { name: string }>(
  items: T[],
  names?: string[],
): Array<T extends { tool: infer TTool } ? TTool : T> {
  const filtered = names
    ? items.filter((item) => names.includes(item.name))
    : items;

  return filtered.map((item) => ("tool" in item ? item.tool : item)) as Array<
    T extends { tool: infer TTool } ? TTool : T
  >;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry !== "undefined"),
  ) as T;
}
