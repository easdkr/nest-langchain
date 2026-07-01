import { Inject } from '@nestjs/common';

//BREAKING: 무명 기본-인스턴스 토큰(NEST_LANGCHAIN_OPENAI_CHAT_MODEL)은 제거됐다.
//팩토리 주입(InjectOpenAIChatModelFactory) 또는 이름별 프리셋(InjectOpenAIChatModel(name))을 사용하라.
export const NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY = Symbol(
  'nest-langchain:openai:chat-model-factory',
);

export function getOpenAIChatModelToken(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('OpenAI chat model preset name is required.');
  }

  return `nest-langchain:openai:${trimmed}:chat-model`;
}

export function InjectOpenAIChatModel(name: string): ParameterDecorator {
  return Inject(getOpenAIChatModelToken(name)) as ParameterDecorator;
}

export function InjectOpenAIChatModelFactory(): ParameterDecorator {
  return Inject(NEST_LANGCHAIN_OPENAI_CHAT_MODEL_FACTORY) as ParameterDecorator;
}
