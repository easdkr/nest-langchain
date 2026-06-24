import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-providers e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('lists provider package tokens without requiring API keys', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const providersResponse = await fetch(`${baseUrl}/providers`);
    expect(providersResponse.ok).toBe(true);
    const providers = (await providersResponse.json()) as Array<{
      name: string;
      packageName: string;
      configured: boolean;
      requiredEnv: string[];
    }>;

    expect(providers.map((provider) => provider.name)).toEqual([
      'openai',
      'openai-compatible',
      'anthropic',
      'gemini',
      'bedrock',
    ]);
    expect(providers[0]).toMatchObject({
      packageName: '@nest-langchain/openai',
      requiredEnv: ['OPENAI_API_KEY'],
    });
    expect(typeof providers[0]?.configured).toBe('boolean');

    const invokeResponse = await fetch(`${baseUrl}/providers/not-real/invoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'hello',
      }),
    });
    expect(invokeResponse.status).toBe(400);
    await expect(invokeResponse.json()).resolves.toMatchObject({
      message: 'Unknown provider "not-real".',
    });
  });
});
