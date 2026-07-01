import { ChatAnthropic } from '@langchain/anthropic';

export interface AnthropicChatModelOverrides {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown; // 그 외 ChatAnthropic 생성 필드 passthrough
}

export interface AnthropicChatModelCreateOptions
  extends AnthropicChatModelOverrides {
  model: string; // 필수 — 라이브러리는 model을 임의로 정하지 않음
}

export interface AnthropicConnection {
  apiKey: string;
  anthropicApiUrl?: string;
}

export class AnthropicChatModelFactory {
  constructor(private readonly connection: AnthropicConnection) {}

  create(options: AnthropicChatModelCreateOptions): ChatAnthropic {
    const { model, temperature, ...rest } = options;
    const config: Record<string, unknown> = {
      apiKey: this.connection.apiKey,
      model, // 필수, fallback 없음
      temperature: temperature ?? 0, // 호출 단위 중립 기본값(model과 무관)
      ...rest,
    };

    if (this.connection.anthropicApiUrl) {
      config.anthropicApiUrl = this.connection.anthropicApiUrl;
    }

    return new (ChatAnthropic as ChatAnthropicConstructor)(config);
  }
}

type ChatAnthropicConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatAnthropic>;
