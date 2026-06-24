import type { DynamicModule } from '@nestjs/common';
import {
  NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
  OpenAIProviderModule,
} from '@nest-langchain/openai';
import {
  getOpenAICompatibleModelToken,
  OpenAICompatibleProviderModule,
} from '@nest-langchain/openai-compatible';

export const OPENAI_MODEL_TOKEN = NEST_LANGCHAIN_OPENAI_CHAT_MODEL;
export const OPENAI_COMPATIBLE_MODEL_TOKEN = getOpenAICompatibleModelToken();

export function buildModelProviderImports(): DynamicModule[] {
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

  return imports;
}
