import { Inject, Injectable, Optional } from '@nestjs/common';

import { LANG_SMITH_OPTIONS } from './constants';
import type {
  AppliedLangSmithEnvironment,
  LangSmithOptions,
} from './interfaces';

@Injectable()
export class LangSmithEnvironment {
  constructor(
    @Optional()
    @Inject(LANG_SMITH_OPTIONS)
    private readonly options: LangSmithOptions = {},
  ) {}

  apply(): AppliedLangSmithEnvironment {
    this.set('LANGSMITH_TRACING', booleanString(this.options.enabled));
    this.set('LANGSMITH_API_KEY', this.options.apiKey);
    this.set('LANGSMITH_ENDPOINT', this.options.endpoint);
    this.set('LANGSMITH_PROJECT', this.options.project);
    this.set('LANGSMITH_WORKSPACE_ID', this.options.workspaceId);

    if (typeof this.options.background === 'boolean') {
      const value = booleanString(this.options.background);
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

  private set(key: string, value: string | undefined): void {
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

