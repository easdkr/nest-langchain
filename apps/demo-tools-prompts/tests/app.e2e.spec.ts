import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-tools-prompts e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('lists prompt definitions and invokes a discovered LangChain tool', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const promptsResponse = await fetch(`${baseUrl}/prompts`);
    expect(promptsResponse.ok).toBe(true);
    const prompts = (await promptsResponse.json()) as Array<{
      name: string;
      inputVariables: string[];
    }>;
    expect(prompts[0]).toMatchObject({
      name: 'support.reply',
      inputVariables: ['customer', 'topic', 'tone'],
    });

    const promptResponse = await fetch(`${baseUrl}/prompts/support-reply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer: 'Acme',
        topic: 'checkout card failure',
        tone: 'concise',
      }),
    });
    expect(promptResponse.ok).toBe(true);
    await expect(promptResponse.json()).resolves.toEqual({
      prompt:
        'Write a concise support reply to Acme about checkout card failure.',
    });

    const toolsResponse = await fetch(`${baseUrl}/tools`);
    expect(toolsResponse.ok).toBe(true);
    const tools = (await toolsResponse.json()) as Array<{
      name: string;
      kind: string;
      tags: string[];
    }>;
    expect(tools[0]).toMatchObject({
      name: 'support_priority',
      kind: 'tool',
      tags: ['support', 'demo'],
    });

    const toolResponse = await fetch(`${baseUrl}/tools/support-priority`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'Enterprise checkout is blocked',
        tier: 'enterprise',
      }),
    });
    expect(toolResponse.ok).toBe(true);
    await expect(toolResponse.json()).resolves.toEqual({
      result: {
        intent: 'checkout',
        priority: 'high',
        queue: 'support-escalation',
      },
    });
  });
});
