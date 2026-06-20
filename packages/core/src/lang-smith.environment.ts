import { Inject, Injectable, Optional } from '@nestjs/common';

import { LANG_CHAIN_OPTIONS } from './constants';
import type { LangChainModuleOptions, LangSmithOptions } from './interfaces';

export interface AppliedLangSmithEnvironment {
  LANGSMITH_TRACING?: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_ENDPOINT?: string;
  LANGSMITH_PROJECT?: string;
  LANGSMITH_WORKSPACE_ID?: string;
  LANGCHAIN_CALLBACKS_BACKGROUND?: string;
  LANGSMITH_TRACING_BACKGROUND?: string;
}

@Injectable()
export class LangSmithEnvironment {
  constructor(
    @Optional()
    @Inject(LANG_CHAIN_OPTIONS)
    private readonly options: LangChainModuleOptions = {},
  ) {}

  apply(): AppliedLangSmithEnvironment {
    const langSmith = this.options.langSmith;

    if (!langSmith) {
      return this.current();
    }

    this.set('LANGSMITH_TRACING', booleanString(langSmith.enabled));
    this.set('LANGSMITH_API_KEY', langSmith.apiKey);
    this.set('LANGSMITH_ENDPOINT', langSmith.endpoint);
    this.set('LANGSMITH_PROJECT', langSmith.project);
    this.set('LANGSMITH_WORKSPACE_ID', langSmith.workspaceId);

    if (typeof langSmith.background === 'boolean') {
      const value = booleanString(langSmith.background);
      this.set('LANGCHAIN_CALLBACKS_BACKGROUND', value);
      this.set('LANGSMITH_TRACING_BACKGROUND', value);
    }

    return this.current();
  }

  current(): AppliedLangSmithEnvironment {
    return {
      LANGSMITH_TRACING: process.env.LANGSMITH_TRACING,
      LANGSMITH_API_KEY: redact(process.env.LANGSMITH_API_KEY),
      LANGSMITH_ENDPOINT: process.env.LANGSMITH_ENDPOINT,
      LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT,
      LANGSMITH_WORKSPACE_ID: process.env.LANGSMITH_WORKSPACE_ID,
      LANGCHAIN_CALLBACKS_BACKGROUND: process.env.LANGCHAIN_CALLBACKS_BACKGROUND,
      LANGSMITH_TRACING_BACKGROUND: process.env.LANGSMITH_TRACING_BACKGROUND,
    };
  }

  private set(key: keyof LangSmithOptions | string, value: string | undefined): void {
    if (typeof value === 'undefined') {
      return;
    }

    process.env[key] = value;
  }
}

function booleanString(value: boolean | undefined): string | undefined {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return value ? 'true' : 'false';
}

function redact(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  if (value.length <= 8) {
    return '***';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

