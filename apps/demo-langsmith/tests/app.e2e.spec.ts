import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-langsmith e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('runs the traceable support case handler through HTTP', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const response = await fetch(`${baseUrl}/trace`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Customer cannot complete checkout with saved card.',
        accountId: 'acct_live_customer_42',
      }),
    });
    expect(response.ok).toBe(true);
    const body = (await response.json()) as {
      accountId: string;
      intent: string;
      summary: string;
      tracing: {
        package: string;
      };
    };

    expect(body.accountId).toBe('acct...42');
    expect(body.intent).toBe('billing');
    expect(body.summary).toContain('checkout');
    expect(body.tracing.package).toBe('@nest-langchain/langsmith');
  });
});
