import { Inject } from '@nestjs/common';

// BREAKING: 무명 기본-인스턴스 토큰(NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL)은 제거됐다.
// 팩토리 주입(InjectAnthropicChatModelFactory) 또는 이름별 프리셋(InjectAnthropicChatModel(name))을 사용하라.
export const NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY = Symbol(
  'nest-langchain:anthropic:chat-model-factory',
);

export function getAnthropicChatModelToken(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('Anthropic chat model preset name is required.');
  }

  return `nest-langchain:anthropic:${trimmed}:chat-model`;
}

export function InjectAnthropicChatModel(name: string): ParameterDecorator {
  return Inject(getAnthropicChatModelToken(name)) as ParameterDecorator;
}

export function InjectAnthropicChatModelFactory(): ParameterDecorator {
  return Inject(
    NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL_FACTORY,
  ) as ParameterDecorator;
}
