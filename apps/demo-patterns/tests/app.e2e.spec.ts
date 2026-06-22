import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';

describe('demo-patterns e2e', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('lists and invokes a decorated multi-provider collaboration task through HTTP', async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const tasksResponse = await fetch(`${baseUrl}/tasks`);
    expect(tasksResponse.ok).toBe(true);
    const tasks = (await tasksResponse.json()) as Array<{
      name: string;
      nodes: string[];
      models: string[];
    }>;

    expect(tasks[0]).toMatchObject({
      name: 'launch-review',
      nodes: ['drafts', 'score', 'decision'],
      models: ['planner', 'critic', 'judge'],
    });

    const invokeResponse = await fetch(`${baseUrl}/tasks/launch-review`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        product: 'Nest LangChain Patterns',
        market: 'Korea B2B SaaS',
      }),
    });
    expect(invokeResponse.ok).toBe(true);
    const body = (await invokeResponse.json()) as {
      taskName: string;
      output: {
        decision: string;
        owner: string;
      };
      steps: {
        drafts: Record<string, { content: string }>;
        score: {
          toolCalls: Array<{
            name: string;
            args: {
              score: number;
              reason: string;
            };
          }>;
        };
      };
    };

    expect(body.taskName).toBe('launch-review');
    expect(body.steps.drafts.planner.content).toContain(
      'planner:Draft a launch plan',
    );
    expect(body.steps.drafts.critic.content).toContain(
      'critic:Draft a launch plan',
    );
    expect(body.steps.score.toolCalls[0]).toMatchObject({
      name: 'score_plan',
      args: {
        score: 9,
        reason: 'critic approved',
      },
    });
    expect(body.output).toEqual({
      decision: 'ship',
      owner: 'judge',
    });
  });
});
