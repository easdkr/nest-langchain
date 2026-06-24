import {
  NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
  AnthropicProviderModule,
} from '@nest-langchain/anthropic';
import {
  NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
  BedrockProviderModule,
} from '@nest-langchain/bedrock';
import {
  NEST_LANGCHAIN_GEMINI_CHAT_MODEL,
  GeminiProviderModule,
} from '@nest-langchain/gemini';
import {
  getOpenAICompatibleModelToken,
  OpenAICompatibleProviderModule,
} from '@nest-langchain/openai-compatible';
import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
  OpenAIProviderModule,
} from '@nest-langchain/openai';
import type { DynamicModule } from '@nestjs/common';

export type ProviderName =
  | 'openai'
  | 'openai-compatible'
  | 'anthropic'
  | 'gemini'
  | 'bedrock';

export interface ProviderCatalogItem {
  name: ProviderName;
  packageName: string;
  token: string | symbol;
  requiredEnv: string[];
  description: string;
}

export const PROVIDER_CATALOG: ProviderCatalogItem[] = [
  {
    name: 'openai',
    packageName: '@nest-langchain/openai',
    token: NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
    requiredEnv: ['OPENAI_API_KEY'],
    description: 'OpenAI ChatOpenAI provider token.',
  },
  {
    name: 'openai-compatible',
    packageName: '@nest-langchain/openai-compatible',
    token: getOpenAICompatibleModelToken(),
    requiredEnv: [
      'OPENAI_COMPATIBLE_API_KEY',
      'OPENAI_COMPATIBLE_BASE_URL',
      'OPENAI_COMPATIBLE_MODEL',
    ],
    description: 'OpenAI-compatible Chat Completions provider token.',
  },
  {
    name: 'anthropic',
    packageName: '@nest-langchain/anthropic',
    token: NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    requiredEnv: ['ANTHROPIC_API_KEY or CLAUDE_API_KEY'],
    description: 'Anthropic ChatAnthropic provider token.',
  },
  {
    name: 'gemini',
    packageName: '@nest-langchain/gemini',
    token: NEST_LANGCHAIN_GEMINI_CHAT_MODEL,
    requiredEnv: ['GOOGLE_API_KEY or GEMINI_API_KEY'],
    description: 'Google Gemini chat model provider token.',
  },
  {
    name: 'bedrock',
    packageName: '@nest-langchain/bedrock',
    token: NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
    requiredEnv: ['AWS_REGION or AWS_DEFAULT_REGION'],
    description: 'AWS Bedrock converse chat model provider token.',
  },
];

export function buildProviderImports(): DynamicModule[] {
  const imports: DynamicModule[] = [];

  if (process.env.OPENAI_API_KEY) {
    imports.push(OpenAIProviderModule.forRoot());
  }

  if (
    process.env.OPENAI_COMPATIBLE_API_KEY &&
    process.env.OPENAI_COMPATIBLE_BASE_URL &&
    process.env.OPENAI_COMPATIBLE_MODEL
  ) {
    imports.push(OpenAICompatibleProviderModule.forRoot());
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) {
    imports.push(AnthropicProviderModule.forRoot());
  }

  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
    imports.push(GeminiProviderModule.forRoot());
  }

  if (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) {
    imports.push(BedrockProviderModule.forRoot());
  }

  return imports;
}
