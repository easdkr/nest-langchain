import { Inject } from '@nestjs/common';

// BREAKING: 무명 기본-인스턴스 토큰(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL)은 제거됐다.
// 팩토리 주입(InjectBedrockChatModelFactory) 또는 이름별 프리셋(InjectBedrockChatModel(name))을 사용하라.
export const NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY = Symbol(
  'nest-langchain:bedrock:chat-model-factory',
);

export function getBedrockChatModelToken(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('Bedrock chat model preset name is required.');
  }

  return `nest-langchain:bedrock:${trimmed}:chat-model`;
}

export function InjectBedrockChatModel(name: string): ParameterDecorator {
  return Inject(getBedrockChatModelToken(name)) as ParameterDecorator;
}

export function InjectBedrockChatModelFactory(): ParameterDecorator {
  return Inject(NEST_LANGCHAIN_BEDROCK_CHAT_MODEL_FACTORY) as ParameterDecorator;
}
