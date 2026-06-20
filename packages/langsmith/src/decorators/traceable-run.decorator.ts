import { traceable } from 'langsmith/traceable';

import type { TraceableRunOptions } from '../interfaces';

export function TraceableRun(options: TraceableRunOptions = {}): MethodDecorator {
  return (_target, propertyKey, descriptor) => {
    const original = descriptor.value;

    if (typeof original !== 'function') {
      throw new TypeError('@TraceableRun can only decorate methods.');
    }

    descriptor.value = function tracedMethod(this: unknown, ...args: unknown[]) {
      const wrapped = traceable(original.bind(this), {
        name: options.name ?? String(propertyKey),
        run_type: options.runType ?? 'chain',
        project_name: options.projectName,
        tags: options.tags,
        metadata: options.metadata,
        tracingEnabled: options.tracingEnabled,
      });

      return wrapped(...args);
    } as typeof descriptor.value;
  };
}

