import { Inject } from '@nestjs/common';

// BREAKING: 무명 기본-인스턴스 토큰(NEST_LANGCHAIN_GEMINI_CHAT_MODEL)은 제거됐다.
// 팩토리 주입(InjectGeminiChatModelFactory) 또는 이름별 프리셋(InjectGeminiChatModel(name))을 사용하라.
export const NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY = Symbol(
  'nest-langchain:gemini:chat-model-factory',
);

export function getGeminiChatModelToken(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('Gemini chat model preset name is required.');
  }

  return `nest-langchain:gemini:${trimmed}:chat-model`;
}

export function InjectGeminiChatModel(name: string): ParameterDecorator {
  return Inject(getGeminiChatModelToken(name)) as ParameterDecorator;
}

export function InjectGeminiChatModelFactory(): ParameterDecorator {
  return Inject(NEST_LANGCHAIN_GEMINI_CHAT_MODEL_FACTORY) as ParameterDecorator;
}
