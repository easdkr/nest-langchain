import type {
  CollaborativeTaskOptions,
  RunnableModelLike,
  TaskExecutionContext,
  TaskExecutionResult,
  TaskStepOptions,
} from './interfaces';

export interface DiscoveredStep {
  name: string;
  methodName: string;
  options: TaskStepOptions;
  handler: (input: unknown, context: TaskExecutionContext) => unknown;
}

export class CollaborativeTaskRunner {
  private readonly modelsByRole = new Map<string, RunnableModelLike>();
  private readonly orderedSteps: DiscoveredStep[];

  constructor(
    private readonly taskName: string,
    private readonly options: CollaborativeTaskOptions,
    private readonly steps: DiscoveredStep[],
    models: Record<string, RunnableModelLike>,
  ) {
    for (const [role, model] of Object.entries(models)) {
      this.modelsByRole.set(role, model);
    }

    this.orderedSteps = sortSteps(steps);
  }

  async invoke(input: unknown): Promise<TaskExecutionResult> {
    const context: TaskExecutionContext = {
      taskName: this.taskName,
      input,
      steps: {},
    };

    for (const step of this.orderedSteps) {
      context.steps[step.name] = await this.invokeStep(step, input, context);
    }

    const lastStep = this.orderedSteps.at(-1);

    return {
      taskName: this.taskName,
      input,
      steps: context.steps,
      output: lastStep ? context.steps[lastStep.name] : undefined,
    };
  }

  private async invokeStep(
    step: DiscoveredStep,
    input: unknown,
    context: TaskExecutionContext,
  ): Promise<unknown> {
    const prompt = await step.handler(input, context);
    const pattern = step.options.pattern ?? 'invoke';

    if (pattern === 'parallel') {
      const roles =
        step.options.models ?? this.options.models.map(({ role }) => role);
      const entries = await Promise.all(
        roles.map(async (role) => [
          role,
          normalizeMessage(await this.model(role).invoke(prompt)),
        ]),
      );

      return Object.fromEntries(entries);
    }

    if (pattern === 'fallback') {
      return this.invokeFallback(step, prompt);
    }

    const role =
      step.options.model ??
      step.options.models?.[0] ??
      this.options.models[0]?.role;
    const model = this.model(role);

    if (pattern === 'structured') {
      if (typeof model.withStructuredOutput !== 'function') {
        throw new Error(
          `Model role "${role}" does not support structured output.`,
        );
      }

      return model
        .withStructuredOutput(step.options.schema, {
          name: step.options.schemaName ?? step.name,
        })
        .invoke(prompt);
    }

    if (pattern === 'tool-call') {
      if (typeof model.bindTools !== 'function') {
        throw new Error(`Model role "${role}" does not support tool calling.`);
      }

      const message = await model
        .bindTools(step.options.tools ?? [], normalizeToolOptions(step.options))
        .invoke(prompt);

      return {
        ...normalizeMessage(message),
        toolCalls: extractToolCalls(message),
      };
    }

    return {
      role,
      ...normalizeMessage(await model.invoke(prompt)),
    };
  }

  private async invokeFallback(
    step: DiscoveredStep,
    prompt: unknown,
  ): Promise<unknown> {
    const attempts: Array<{ role: string; error: string }> = [];

    for (const role of step.options.models ?? []) {
      try {
        return {
          role,
          ...normalizeMessage(await this.model(role).invoke(prompt)),
          attempts,
        };
      } catch (error) {
        attempts.push({
          role,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw new Error(
      `Task step "${step.name}" exhausted fallback models: ${attempts
        .map((attempt) => `${attempt.role}: ${attempt.error}`)
        .join(', ')}`,
    );
  }

  private model(role: string | undefined): RunnableModelLike {
    if (!role) {
      throw new Error(`Task "${this.taskName}" does not declare a model role.`);
    }

    const model = this.modelsByRole.get(role);

    if (!model) {
      throw new Error(
        `Unknown model role "${role}" for task "${this.taskName}".`,
      );
    }

    return model;
  }
}

function sortSteps(steps: DiscoveredStep[]): DiscoveredStep[] {
  const remaining = [...steps];
  const sorted: DiscoveredStep[] = [];
  const completed = new Set<string>();

  while (remaining.length > 0) {
    const index = remaining.findIndex((step) =>
      (step.options.dependsOn ?? []).every((dependency) =>
        completed.has(dependency),
      ),
    );

    if (index === -1) {
      throw new Error(
        'Collaborative task contains circular or unknown dependencies.',
      );
    }

    const [next] = remaining.splice(index, 1);
    sorted.push(next);
    completed.add(next.name);
  }

  return sorted;
}

function normalizeToolOptions(
  options: TaskStepOptions,
): Record<string, unknown> {
  return typeof options.toolChoice === 'undefined'
    ? {}
    : {
        toolChoice: options.toolChoice,
      };
}

export function normalizeMessage(value: unknown): Record<string, unknown> {
  if (isRecord(value) && 'content' in value) {
    return {
      content: stringifyContent(value.content),
    };
  }

  return {
    content: stringifyContent(value),
  };
}

export function extractToolCalls(value: unknown): unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  if (Array.isArray(value.tool_calls)) {
    return value.tool_calls;
  }

  if (Array.isArray(value.toolCalls)) {
    return value.toolCalls;
  }

  return [];
}

function stringifyContent(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        isRecord(item) && typeof item.text === 'string'
          ? item.text
          : JSON.stringify(item),
      )
      .join('');
  }

  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
