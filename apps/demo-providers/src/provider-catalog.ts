import {
  AnthropicProviderModule,
  getAnthropicChatModelToken,
} from '@nest-langchain/anthropic';
import {
  BedrockProviderModule,
  getBedrockChatModelToken,
} from '@nest-langchain/bedrock';
import {
  GeminiProviderModule,
  getGeminiChatModelToken,
} from '@nest-langchain/gemini';
import {
  getOpenAICompatibleModelToken,
  OpenAICompatibleProviderModule,
} from '@nest-langchain/openai-compatible';
import {
  getOpenAIChatModelToken,
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
  token: string;
  requiredEnv: string[];
  description: string;
}

export const PROVIDER_CATALOG: ProviderCatalogItem[] = [
  {
    name: 'openai',
    packageName: '@nest-langchain/openai',
    token: getOpenAIChatModelToken('default'),
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
    token: getAnthropicChatModelToken('default'),
    requiredEnv: ['ANTHROPIC_API_KEY or CLAUDE_API_KEY'],
    description: 'Anthropic ChatAnthropic provider token.',
  },
  {
    name: 'gemini',
    packageName: '@nest-langchain/gemini',
    token: getGeminiChatModelToken('default'),
    requiredEnv: ['GOOGLE_API_KEY or GEMINI_API_KEY'],
    description: 'Google Gemini chat model provider token.',
  },
  {
    name: 'bedrock',
    packageName: '@nest-langchain/bedrock',
    token: getBedrockChatModelToken('default'),
    requiredEnv: ['AWS_REGION or AWS_DEFAULT_REGION'],
    description: 'AWS Bedrock converse chat model provider token.',
  },
];

export function buildProviderImports(): DynamicModule[] {
  const imports: DynamicModule[] = [];

  if (process.env.OPENAI_API_KEY) {
    imports.push(
      OpenAIProviderModule.forRoot({
        presets: [
          {
            name: 'default',
            model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
          },
        ],
      }),
    );
  }

  if (
    process.env.OPENAI_COMPATIBLE_API_KEY &&
    process.env.OPENAI_COMPATIBLE_BASE_URL &&
    process.env.OPENAI_COMPATIBLE_MODEL
  ) {
    imports.push(OpenAICompatibleProviderModule.forRoot());
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) {
    imports.push(
      AnthropicProviderModule.forRoot({
        presets: [
          {
            name: 'default',
            model: 'claude-haiku-4-5-20251001',
          },
        ],
      }),
    );
  }

  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
    imports.push(
      GeminiProviderModule.forRoot({
        presets: [{ name: 'default', model: 'gemini-2.5-flash' }],
      }),
    );
  }

  if (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) {
    imports.push(
      BedrockProviderModule.forRoot({
        presets: [
          {
            name: 'default',
            model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          },
        ],
      }),
    );
  }

  return imports;
}
