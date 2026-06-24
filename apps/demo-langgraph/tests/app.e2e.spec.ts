import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_COMPATIBLE_API_KEY',
  'OPENAI_COMPATIBLE_BASE_URL',
  'OPENAI_COMPATIBLE_MODEL',
  'LANGSMITH_TRACING',
] as const;

describe('demo-langgraph e2e', () => {
  let app: INestApplication | undefined;
  let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    restoreEnv();
    vi.resetModules();
  });

  it('starts without model keys and completes a typed support workflow', async () => {
    const baseUrl = await startApp();

    const graphsResponse = await fetch(`${baseUrl}/graphs`);
    expect(graphsResponse.ok).toBe(true);
    const graphs = (await graphsResponse.json()) as Array<{
      name: string;
      kind: string;
      nodes: string[];
    }>;

    expect(graphs).toContainEqual(
      expect.objectContaining({
        name: 'support-policy',
        kind: 'graph',
      }),
    );
    expect(graphs).toContainEqual(
      expect.objectContaining({
        name: 'support-intake',
        kind: 'graph',
        nodes: expect.arrayContaining([
          'classifyAndRoute',
          'loadPolicy',
          'planReviews',
          'draftResponse',
        ]),
      }),
    );

    const configResponse = await fetch(
      `${baseUrl}/graphs/support-intake/config`,
    );
    expect(configResponse.ok).toBe(true);
    await expect(configResponse.json()).resolves.toMatchObject({
      provider: 'fallback',
      langSmithTracing: false,
    });

    const invokeResponse = await fetch(`${baseUrl}/graphs/support-intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Delivery tracking is late.',
        customerTier: 'pro',
        channel: 'chat',
      }),
    });
    expect(invokeResponse.ok).toBe(true);
    const body = (await invokeResponse.json()) as {
      threadId: string;
      status: string;
      provider: string;
      result: {
        message: string;
        intent: string;
        priority: string;
        routingKey: string;
        response: string;
        policy: {
          queue: string;
        };
        reviewNotes: string[];
      };
    };

    expect(body.threadId).toMatch(/^support_/);
    expect(body.status).toBe('completed');
    expect(body.provider).toBe('fallback');
    expect(body.result.message).toContain('Delivery');
    expect(body.result.intent).toBe('delivery');
    expect(body.result.priority).toBe('medium');
    expect(body.result.routingKey).toBe('support-delivery');
    expect(body.result.policy.queue).toBe('delivery-operations');
    expect(body.result.reviewNotes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('logistics'),
        expect.stringContaining('policy'),
      ]),
    );
    expect(body.result.response).toContain('support-delivery');
  });

  it('pauses high-risk requests for approval and resumes the same thread', async () => {
    const baseUrl = await startApp();

    const invokeResponse = await fetch(`${baseUrl}/graphs/support-intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Checkout is down and blocking our enterprise launch.',
        customerTier: 'enterprise',
        channel: 'web',
        approvalRequired: true,
      }),
    });
    expect(invokeResponse.ok).toBe(true);
    const waiting = (await invokeResponse.json()) as {
      threadId: string;
      status: string;
      interrupt: {
        value: {
          action: string;
          routingKey: string;
          priority: string;
        };
      };
    };

    expect(waiting.status).toBe('waiting_for_approval');
    expect(waiting.interrupt.value).toMatchObject({
      action: 'approve_support_response',
      routingKey: 'support-escalation',
      priority: 'critical',
    });

    const resumeResponse = await fetch(
      `${baseUrl}/graphs/support-intake/resume`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          threadId: waiting.threadId,
          decision: {
            approved: true,
            reviewer: 'ops-lead',
            note: 'Send the escalation draft.',
          },
        }),
      },
    );
    expect(resumeResponse.ok).toBe(true);
    const resumed = (await resumeResponse.json()) as {
      status: string;
      result: {
        approval: {
          approved: boolean;
          reviewer: string;
        };
        response: string;
      };
    };

    expect(resumed.status).toBe('completed');
    expect(resumed.result.approval).toMatchObject({
      approved: true,
      reviewer: 'ops-lead',
    });
    expect(resumed.result.response).toContain('support-escalation');
  });

  it('rejects invalid typed support input with field-level errors', async () => {
    const baseUrl = await startApp();

    const response = await fetch(`${baseUrl}/graphs/support-intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: '',
        customerTier: 'vip',
        channel: '',
        approvalRequired: 'yes',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid support intake request.',
      errors: {
        message: expect.any(String),
        customerTier: expect.any(String),
        channel: expect.any(String),
        approvalRequired: expect.any(String),
      },
    });
  });

  it('streams graph events as NDJSON', async () => {
    const baseUrl = await startApp();

    const response = await fetch(`${baseUrl}/graphs/support-intake/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Delivery tracking is late.',
        customerTier: 'pro',
        channel: 'chat',
      }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain(
      'application/x-ndjson',
    );
    const text = await response.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.map((line) => JSON.parse(line))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: expect.any(String),
        }),
      ]),
    );
  });

  async function startApp(env: Record<string, string | undefined> = {}) {
    saveAndClearEnv();

    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    const { AppModule } = await import('../src/app.module');

    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);

    return app.getUrl();
  }

  function saveAndClearEnv() {
    savedEnv = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );

    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  }

  function restoreEnv() {
    if (!savedEnv) {
      return;
    }

    for (const key of ENV_KEYS) {
      const value = savedEnv[key];

      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
