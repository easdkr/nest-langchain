import { afterEach, describe, expect, it, vi } from 'vitest';
import { traceable } from 'langsmith/traceable';

import {
  configureLangSmithRuntime,
  LangSmithContext,
  resetLangSmithRuntime,
  TraceableRun,
} from '../src';

vi.mock('langsmith/traceable', () => ({
  traceable: vi.fn((handler: (...args: unknown[]) => unknown) => handler),
}));

describe('@TraceableRun', () => {
  afterEach(() => {
    vi.mocked(traceable).mockClear();
    resetLangSmithRuntime();
  });

  it('merges request metadata and applies redaction hooks to traced runs', async () => {
    configureLangSmithRuntime({
      enabled: true,
      metadata: {
        service: 'support',
      },
      requestMetadata: ({ args, metadata }) => ({
        argCount: args.length,
        tenantId: metadata.tenantId,
      }),
      redactInputs: (inputs) => ({
        ...inputs,
        secret: '[redacted]',
      }),
      redactOutputs: (outputs) => ({
        ...outputs,
        token: '[redacted]',
      }),
    });

    class SupportTrace {
      @TraceableRun({
        name: 'support.reply',
        metadata: {
          operation: 'reply',
        },
      })
      reply(input: { message: string; secret: string }) {
        return {
          answer: input.message,
          token: 'raw-token',
        };
      }
    }

    await LangSmithContext.run(
      {
        tenantId: 'tenant-1',
      },
      () =>
        new SupportTrace().reply({
          message: 'hello',
          secret: 'raw-secret',
        }),
    );

    const config = vi.mocked(traceable).mock.calls[0]?.[1];

    expect(config).toMatchObject({
      name: 'support.reply',
      metadata: {
        service: 'support',
        operation: 'reply',
        tenantId: 'tenant-1',
        argCount: 1,
      },
    });

    const processInputs = config?.processInputs as
      | ((value: Record<string, unknown>) => Promise<Record<string, unknown>>)
      | undefined;
    const processOutputs = config?.processOutputs as
      | ((value: Record<string, unknown>) => Promise<Record<string, unknown>>)
      | undefined;

    await expect(
      processInputs?.({
        message: 'hello',
        secret: 'raw-secret',
      }),
    ).resolves.toEqual({
      message: 'hello',
      secret: '[redacted]',
    });

    await expect(
      processOutputs?.({
        answer: 'hello',
        token: 'raw-token',
      }),
    ).resolves.toEqual({
      answer: 'hello',
      token: '[redacted]',
    });
  });

  it('skips trace wrapping when sampling rejects the run', () => {
    configureLangSmithRuntime({
      enabled: true,
      sampling: () => false,
    });

    class SampledTrace {
      @TraceableRun()
      run() {
        return 'direct';
      }
    }

    expect(new SampledTrace().run()).toBe('direct');
    expect(traceable).not.toHaveBeenCalled();
  });
});
