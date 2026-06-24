import { LangTool, Toolset } from '@nest-langchain/tools';
import { z } from 'zod';

const supportPrioritySchema = z.object({
  message: z.string(),
  tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
});

@Toolset({
  tags: ['support', 'demo'],
  metadata: {
    owner: 'support-platform',
  },
})
export class SupportTools {
  @LangTool({
    name: 'support_priority',
    description: 'Classify support priority from message and customer tier.',
    schema: supportPrioritySchema,
  })
  classifyPriority(input: z.infer<typeof supportPrioritySchema>) {
    const normalized = input.message.toLowerCase();
    const intent = normalized.includes('checkout')
      ? 'checkout'
      : normalized.includes('delivery')
        ? 'delivery'
        : 'general';
    const priority =
      input.tier === 'enterprise' || normalized.includes('blocked')
        ? 'high'
        : 'normal';

    return JSON.stringify({
      intent,
      priority,
      queue: priority === 'high' ? 'support-escalation' : `support-${intent}`,
    });
  }
}
