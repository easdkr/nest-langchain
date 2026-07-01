import type { DynamicModule } from '@nestjs/common';
import {
  getOpenAIChatModelToken,
  OpenAIProviderModule,
} from '@nest-langchain/openai';
import {
  getOpenAICompatibleModelToken,
  OpenAICompatibleProviderModule,
} from '@nest-langchain/openai-compatible';

export const OPENAI_MODEL_TOKEN = getOpenAIChatModelToken('default');
export const OPENAI_COMPATIBLE_MODEL_TOKEN = getOpenAICompatibleModelToken();

export function buildModelProviderImports(): DynamicModule[] {
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

  return imports;
}
