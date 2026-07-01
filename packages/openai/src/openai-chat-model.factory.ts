import { ChatOpenAI } from '@langchain/openai';

export interface OpenAIChatModelOverrides {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown; // 그 외 ChatOpenAI 생성 필드 passthrough
}

export interface OpenAIChatModelCreateOptions extends OpenAIChatModelOverrides {
  model: string; // 필수 — 라이브러리는 model을 임의로 정하지 않음
}

export interface OpenAIConnection {
  apiKey: string;
}

export class OpenAIChatModelFactory {
  constructor(private readonly connection: OpenAIConnection) {}

  create(options: OpenAIChatModelCreateOptions): ChatOpenAI {
    const { model, temperature, ...rest } = options;
    return new ChatOpenAI({
      apiKey: this.connection.apiKey,
      model, // 필수, fallback 없음
      temperature: temperature ?? 0, // 호출 단위 중립 기본값(model과 무관)
      ...rest,
    });
  }
}
