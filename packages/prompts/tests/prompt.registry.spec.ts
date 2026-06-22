import { describe, expect, it } from 'vitest';

import { PromptRegistry } from '../src';

describe('PromptRegistry', () => {
  it('registers and formats named prompt templates', async () => {
    const registry = new PromptRegistry();

    registry.registerPrompt({
      name: 'support.reply',
      template: 'Answer {customer} about {topic}',
      inputVariables: ['customer', 'topic'],
    });

    await expect(
      registry.format('support.reply', {
        customer: 'June',
        topic: 'refunds',
      }),
    ).resolves.toBe('Answer June about refunds');
  });
});
