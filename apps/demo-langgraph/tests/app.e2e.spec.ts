import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-langgraph e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('lists and invokes the decorated LangGraph through HTTP', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const graphsResponse = await fetch(`${baseUrl}/graphs`);
    expect(graphsResponse.ok).toBe(true);
    const graphs = (await graphsResponse.json()) as Array<{
      name: string;
      kind: string;
      nodes: string[];
    }>;

    expect(graphs[0]).toMatchObject({
      name: 'support-intake',
      kind: 'graph',
      nodes: ['classifyRequest', 'draftResponse'],
    });

    const invokeResponse = await fetch(`${baseUrl}/graphs/support-intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Checkout fails with a saved card error.',
        customerTier: 'enterprise',
        channel: 'web',
      }),
    });
    expect(invokeResponse.ok).toBe(true);
    const body = (await invokeResponse.json()) as {
      message: string;
      intent: string;
      priority: string;
      routingKey: string;
      response: string;
    };

    expect(body.message).toContain('Checkout');
    expect(body.intent).toBe('billing');
    expect(body.priority).toBe('high');
    expect(body.routingKey).toBe('support-billing');
    expect(body.response).toContain('support-billing');
  });
});
