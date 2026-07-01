import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput,
} from '@langchain/google-genai';

export interface GeminiChatModelOverrides {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown; // 그 외 ChatGoogleGenerativeAI 생성 필드 passthrough
}

export interface GeminiChatModelCreateOptions extends GeminiChatModelOverrides {
  model: string; // 필수 — 라이브러리는 model을 임의로 정하지 않음
}

export interface GeminiConnection {
  apiKey: string;
}

export class GeminiChatModelFactory {
  constructor(private readonly connection: GeminiConnection) {}

  create(options: GeminiChatModelCreateOptions): ChatGoogleGenerativeAI {
    const { model, temperature, ...rest } = options;
    return new ChatGoogleGenerativeAI({
      apiKey: this.connection.apiKey,
      model, // 필수, fallback 없음
      temperature: temperature ?? 0, // 호출 단위 중립 기본값(model과 무관)
      ...rest,
    } as GoogleGenerativeAIChatInput);
  }
}
