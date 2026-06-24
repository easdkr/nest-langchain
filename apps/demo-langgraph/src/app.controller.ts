import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { INTERRUPT, isInterrupted } from '@langchain/langgraph';

import { LangGraphRunner, resumeWith } from '@nest-langchain/langgraph';

import { SupportDraftService } from './support-draft.service';
import type {
  ApprovalDecision,
  ApprovalInterruptPayload,
  CustomerTier,
  SupportIntakeInput,
} from './support-types';

interface SupportInvokeBody {
  message?: unknown;
  customerTier?: unknown;
  channel?: unknown;
  approvalRequired?: unknown;
}

interface SupportResumeBody {
  threadId?: unknown;
  decision?: unknown;
}

interface NdjsonResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  write(chunk: string): void;
  end(): void;
}

const CUSTOMER_TIERS: readonly CustomerTier[] = ['free', 'pro', 'enterprise'];

@Controller()
export class AppController {
  constructor(
    private readonly graphs: LangGraphRunner,
    private readonly drafts: SupportDraftService,
  ) {}

  @Get('graphs')
  listGraphs() {
    return this.graphs.listGraphs();
  }

  @Get('graphs/support-intake/config')
  getSupportConfig() {
    return {
      provider: this.drafts.getProviderName(),
      langSmithTracing: process.env.LANGSMITH_TRACING === 'true',
      checkpointer: 'memory',
    };
  }

  @Post('graphs/support-intake')
  async invokeSupportIntake(@Body() body: SupportInvokeBody = {}) {
    const input = parseSupportInput(body);
    const threadId = createThreadId();
    const result = await this.graphs.invoke('support-intake', input, {
      configurable: {
        thread_id: threadId,
      },
    });

    return this.toSupportResponse(threadId, result);
  }

  @Post('graphs/support-intake/resume')
  async resumeSupportIntake(@Body() body: SupportResumeBody = {}) {
    const { threadId, decision } = parseResumeInput(body);
    const result = await this.graphs.invoke(
      'support-intake',
      resumeWith(decision),
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    return this.toSupportResponse(threadId, result);
  }

  @Post('graphs/support-intake/events')
  async streamSupportIntakeEvents(
    @Body() body: SupportInvokeBody = {},
    @Res() response: NdjsonResponse,
  ) {
    const input = parseSupportInput(body);
    const threadId = createThreadId();

    response.statusCode = 200;
    response.setHeader('content-type', 'application/x-ndjson; charset=utf-8');

    for await (const event of this.graphs.streamEvents(
      'support-intake',
      input,
      {
        configurable: {
          thread_id: threadId,
        },
      },
      {
        version: 'v2',
      },
    )) {
      response.write(`${JSON.stringify(event)}\n`);
    }

    response.end();
  }

  @Post('graphs/:name/invoke')
  invokeGraph(@Param('name') name: string, @Body() body: unknown = {}) {
    return this.graphs.invoke(name, body);
  }

  private toSupportResponse(threadId: string, result: unknown) {
    if (isInterrupted<ApprovalInterruptPayload>(result)) {
      return {
        threadId,
        status: 'waiting_for_approval',
        provider: this.drafts.getProviderName(),
        interrupt: result[INTERRUPT][0],
      };
    }

    return {
      threadId,
      status: 'completed',
      provider: resolveProvider(result, this.drafts.getProviderName()),
      result,
    };
  }
}

function parseSupportInput(body: SupportInvokeBody): SupportIntakeInput {
  const errors: Record<string, string> = {};
  const message =
    typeof body.message === 'string' ? body.message.trim() : undefined;
  const channel =
    typeof body.channel === 'string' ? body.channel.trim() : undefined;

  if (!message) {
    errors.message = 'message must be a non-empty string.';
  }

  if (
    typeof body.customerTier !== 'string' ||
    !CUSTOMER_TIERS.includes(body.customerTier as CustomerTier)
  ) {
    errors.customerTier = 'customerTier must be free, pro, or enterprise.';
  }

  if (typeof body.channel !== 'undefined' && !channel) {
    errors.channel = 'channel must be a non-empty string when provided.';
  }

  if (
    typeof body.approvalRequired !== 'undefined' &&
    typeof body.approvalRequired !== 'boolean'
  ) {
    errors.approvalRequired =
      'approvalRequired must be a boolean when provided.';
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({
      message: 'Invalid support intake request.',
      errors,
    });
  }

  return {
    message: message!,
    customerTier: body.customerTier as CustomerTier,
    channel: channel ?? 'web',
    approvalRequired: body.approvalRequired === true,
  };
}

function parseResumeInput(body: SupportResumeBody): {
  threadId: string;
  decision: ApprovalDecision;
} {
  const errors: Record<string, string> = {};
  const threadId =
    typeof body.threadId === 'string' ? body.threadId.trim() : undefined;
  const decision =
    body.decision && typeof body.decision === 'object'
      ? (body.decision as Record<string, unknown>)
      : undefined;
  const reviewer =
    typeof decision?.reviewer === 'string'
      ? decision.reviewer.trim()
      : undefined;
  const note =
    typeof decision?.note === 'string' ? decision.note.trim() : undefined;

  if (!threadId) {
    errors.threadId = 'threadId must be a non-empty string.';
  }

  if (!decision) {
    errors.decision = 'decision must be an object.';
  } else {
    if (typeof decision.approved !== 'boolean') {
      errors['decision.approved'] = 'decision.approved must be a boolean.';
    }

    if (!reviewer) {
      errors['decision.reviewer'] =
        'decision.reviewer must be a non-empty string.';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({
      message: 'Invalid support resume request.',
      errors,
    });
  }

  return {
    threadId: threadId!,
    decision: {
      approved: decision!.approved === true,
      reviewer: reviewer!,
      note: note || undefined,
    },
  };
}

function createThreadId() {
  return `support_${randomUUID()}`;
}

function resolveProvider(result: unknown, fallback: string) {
  if (
    result &&
    typeof result === 'object' &&
    'provider' in result &&
    typeof result.provider === 'string'
  ) {
    return result.provider;
  }

  return fallback;
}
