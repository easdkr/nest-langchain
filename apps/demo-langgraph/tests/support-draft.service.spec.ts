import 'reflect-metadata';

import { ModuleRef } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { SupportDraftService } from '../src/support-draft.service';

describe('SupportDraftService', () => {
  it('prefers OpenAI over OpenAI-compatible and falls back when no model is configured', async () => {
    const openAiModel = {
      invoke: vi.fn(async () => ({
        content: 'OpenAI draft',
      })),
    };
    const compatibleModel = {
      invoke: vi.fn(async () => ({
        content: 'Compatible draft',
      })),
    };
    const moduleRef = {
      get: vi
        .fn()
        .mockReturnValueOnce(openAiModel)
        .mockReturnValueOnce(compatibleModel),
    } as unknown as ModuleRef;
    const service = new SupportDraftService(moduleRef);

    expect(service.getProviderName()).toBe('openai');
    await expect(
      service.draft({
        message: 'Checkout is broken.',
        routingKey: 'support-billing',
        priority: 'high',
        policySummary: 'Billing ownership.',
        reviewNotes: ['account review complete'],
        approvalNote: 'approved',
      }),
    ).resolves.toEqual({
      provider: 'openai',
      response: 'OpenAI draft',
    });
    expect(openAiModel.invoke).toHaveBeenCalledWith(expect.any(String));
    expect(compatibleModel.invoke).not.toHaveBeenCalled();
  });

  it('uses OpenAI-compatible when OpenAI is not configured', async () => {
    const compatibleModel = {
      invoke: vi.fn(async () => ({
        content: 'Compatible draft',
      })),
    };
    const moduleRef = {
      get: vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('missing openai');
        })
        .mockReturnValueOnce(compatibleModel),
    } as unknown as ModuleRef;
    const service = new SupportDraftService(moduleRef);

    expect(service.getProviderName()).toBe('openai-compatible');
    await expect(
      service.draft({
        message: 'Delivery is late.',
        routingKey: 'support-delivery',
        priority: 'medium',
        policySummary: 'Delivery ownership.',
        reviewNotes: ['policy review complete'],
      }),
    ).resolves.toMatchObject({
      provider: 'openai-compatible',
      response: 'Compatible draft',
    });
  });

  it('returns a deterministic fallback draft when no provider is configured', async () => {
    const moduleRef = {
      get: vi.fn(() => {
        throw new Error('missing provider');
      }),
    } as unknown as ModuleRef;
    const service = new SupportDraftService(moduleRef);

    expect(service.getProviderName()).toBe('fallback');
    await expect(
      service.draft({
        message: 'Need help.',
        routingKey: 'support-general',
        priority: 'low',
        policySummary: 'General support ownership.',
        reviewNotes: ['policy review complete'],
      }),
    ).resolves.toMatchObject({
      provider: 'fallback',
      response: expect.stringContaining('support-general'),
    });
  });
});
