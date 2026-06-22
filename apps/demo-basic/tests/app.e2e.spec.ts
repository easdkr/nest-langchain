import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-basic e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('registers and invokes a support triage runnable through HTTP', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const runnablesResponse = await fetch(`${baseUrl}/runnables`);
    expect(runnablesResponse.ok).toBe(true);
    const runnables = (await runnablesResponse.json()) as Array<{
      name: string;
      kind: string;
      nodes: string[];
      tags: string[];
    }>;

    expect(runnables[0]).toMatchObject({
      name: 'support-triage',
      kind: 'chain',
      nodes: ['normalize', 'classify', 'route'],
      tags: ['demo', 'support'],
    });

    const triageResponse = await fetch(`${baseUrl}/support/triage`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Checkout fails with a card error',
        customerTier: 'enterprise',
        channel: 'web',
      }),
    });
    expect(triageResponse.ok).toBe(true);
    const body = (await triageResponse.json()) as {
      classification: {
        intent: string;
        priority: string;
      };
      routing: {
        queue: string;
        escalationRequired: boolean;
      };
      nextActions: string[];
    };

    expect(body.classification).toMatchObject({
      intent: 'billing',
      priority: 'high',
    });
    expect(body.routing.queue).toBe('support-billing');
    expect(body.routing.escalationRequired).toBe(false);
    expect(body.nextActions).toContain('open_support-billing_ticket');
  });
});
