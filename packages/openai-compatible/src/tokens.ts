import { Inject } from '@nestjs/common';

export const DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME = 'default';

export function getOpenAICompatibleModelToken(
  name = DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME,
): string {
  return `nest-langchain:openai-compatible:${normalizeModelName(name)}:chat-model`;
}

export function InjectOpenAICompatibleModel(
  name = DEFAULT_OPENAI_COMPATIBLE_MODEL_NAME,
): ParameterDecorator {
  return Inject(getOpenAICompatibleModelToken(name)) as ParameterDecorator;
}

function normalizeModelName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('OpenAI-compatible model name is required.');
  }

  return trimmed;
}
