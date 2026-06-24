import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  OPENAI_COMPATIBLE_MODEL_TOKEN,
  OPENAI_MODEL_TOKEN,
} from './provider-catalog';
import type {
  DraftProviderName,
  DraftRequest,
  DraftResult,
} from './support-types';

interface ChatModelLike {
  invoke(input: string): Promise<unknown> | unknown;
}

interface ResolvedModel {
  provider: Exclude<DraftProviderName, 'fallback'>;
  model: ChatModelLike;
}

@Injectable()
export class SupportDraftService {
  private resolvedModel: ResolvedModel | null | undefined;

  constructor(private readonly moduleRef: ModuleRef) {}

  getProviderName(): DraftProviderName {
    return this.resolveModel()?.provider ?? 'fallback';
  }

  async draft(request: DraftRequest): Promise<DraftResult> {
    const resolved = this.resolveModel();

    if (!resolved) {
      return {
        provider: 'fallback',
        response: fallbackDraft(request),
      };
    }

    const result = await resolved.model.invoke(buildPrompt(request));

    return {
      provider: resolved.provider,
      response: serializeModelResult(result),
    };
  }

  private resolveModel(): ResolvedModel | undefined {
    if (typeof this.resolvedModel !== 'undefined') {
      return this.resolvedModel ?? undefined;
    }

    const openAi = this.getModel(OPENAI_MODEL_TOKEN);

    if (openAi) {
      this.resolvedModel = {
        provider: 'openai',
        model: openAi,
      };

      return this.resolvedModel;
    }

    const compatible = this.getModel(OPENAI_COMPATIBLE_MODEL_TOKEN);

    if (compatible) {
      this.resolvedModel = {
        provider: 'openai-compatible',
        model: compatible,
      };

      return this.resolvedModel;
    }

    this.resolvedModel = null;

    return undefined;
  }

  private getModel(token: string | symbol): ChatModelLike | undefined {
    try {
      return this.moduleRef.get<ChatModelLike>(token, {
        strict: false,
      });
    } catch {
      return undefined;
    }
  }
}

function buildPrompt(request: DraftRequest): string {
  return [
    'Draft a concise operator-facing support response.',
    `Routing key: ${request.routingKey}`,
    `Priority: ${request.priority}`,
    `Policy: ${request.policySummary}`,
    `Review notes: ${request.reviewNotes.join('; ')}`,
    request.approvalNote ? `Approval note: ${request.approvalNote}` : undefined,
    `Customer message: ${request.message}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function fallbackDraft(request: DraftRequest): string {
  return [
    `Route to ${request.routingKey}.`,
    `Treat as ${request.priority} priority.`,
    request.policySummary,
    `Review notes: ${request.reviewNotes.join('; ')}.`,
    request.approvalNote ? `Approval: ${request.approvalNote}.` : undefined,
    `Customer message: ${request.message}`,
  ]
    .filter(Boolean)
    .join(' ');
}

function serializeModelResult(result: unknown): string {
  if (
    result &&
    typeof result === 'object' &&
    'content' in result &&
    typeof result.content === 'string'
  ) {
    return result.content;
  }

  return typeof result === 'string' ? result : JSON.stringify(result);
}
