import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { PromptRegistry, PromptsModule } from '../src';

describe('PromptsModule', () => {
  it('registers configured prompts in an injectable registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PromptsModule.forRoot({
          prompts: [
            {
              name: 'support.reply',
              template: 'Answer {customer} about {topic}',
              inputVariables: ['customer', 'topic'],
            },
          ],
        }),
      ],
    }).compile();

    const registry = moduleRef.get(PromptRegistry);

    await expect(
      registry.format('support.reply', {
        customer: 'June',
        topic: 'refunds',
      }),
    ).resolves.toBe('Answer June about refunds');

    await moduleRef.close();
  });
});
