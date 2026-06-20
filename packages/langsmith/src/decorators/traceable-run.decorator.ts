import { traceable } from 'langsmith/traceable';

import type {
  LangSmithHookContext,
  LangSmithOptions,
  LangSmithRedactionHook,
  LangSmithTraceMetadata,
  TraceableRunOptions,
} from '../interfaces';
import { LangSmithContext } from '../langsmith.context';
import { getLangSmithRuntimeOptions } from '../langsmith.runtime';

export function TraceableRun(options: TraceableRunOptions = {}): MethodDecorator {
  return (_target, propertyKey, descriptor) => {
    const original = descriptor.value;

    if (typeof original !== 'function') {
      throw new TypeError('@TraceableRun can only decorate methods.');
    }

    descriptor.value = function tracedMethod(this: unknown, ...args: unknown[]) {
      const runtimeOptions = getLangSmithRuntimeOptions();
      const methodName = String(propertyKey);
      const metadata = buildMetadata(methodName, args, runtimeOptions, options);
      const context: LangSmithHookContext = {
        args,
        methodName,
        metadata,
      };

      if (!shouldTrace(context, runtimeOptions, options)) {
        return original.apply(this, args);
      }

      const wrapped = traceable(original.bind(this), {
        name: options.name ?? methodName,
        run_type: options.runType ?? 'chain',
        project_name: options.projectName,
        tags: options.tags,
        metadata,
        tracingEnabled: true,
        processInputs: buildRedactionProcessor(
          context,
          runtimeOptions.redactInputs,
          options.redactInputs,
        ),
        processOutputs: buildRedactionProcessor(
          context,
          runtimeOptions.redactOutputs,
          options.redactOutputs,
        ),
      });

      return wrapped(...args);
    } as typeof descriptor.value;
  };
}

function buildMetadata(
  methodName: string,
  args: unknown[],
  runtimeOptions: LangSmithOptions,
  runOptions: TraceableRunOptions,
): LangSmithTraceMetadata {
  const baseMetadata = {
    ...runtimeOptions.metadata,
    ...runOptions.metadata,
    ...LangSmithContext.current(),
  };
  const baseContext: LangSmithHookContext = {
    args,
    methodName,
    metadata: baseMetadata,
  };

  return {
    ...baseMetadata,
    ...runtimeOptions.requestMetadata?.(baseContext),
    ...runOptions.requestMetadata?.(baseContext),
  };
}

function shouldTrace(
  context: LangSmithHookContext,
  runtimeOptions: LangSmithOptions,
  runOptions: TraceableRunOptions,
): boolean {
  const tracingEnabled = runOptions.tracingEnabled ?? runtimeOptions.enabled;

  if (tracingEnabled === false) {
    return false;
  }

  if (runtimeOptions.sampling?.(context) === false) {
    return false;
  }

  if (runOptions.sampling?.(context) === false) {
    return false;
  }

  return true;
}

function buildRedactionProcessor(
  context: LangSmithHookContext,
  runtimeHook?: LangSmithRedactionHook,
  runHook?: LangSmithRedactionHook,
) {
  const hooks = [runtimeHook, runHook].filter(
    (hook): hook is LangSmithRedactionHook => typeof hook === 'function',
  );

  if (hooks.length === 0) {
    return undefined;
  }

  return async (value: Readonly<Record<string, unknown>>) => {
    let next = {
      ...value,
    };

    for (const hook of hooks) {
      next = await hook(next, context);
    }

    return next;
  };
}
