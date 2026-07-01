import { ChatBedrockConverse } from '@langchain/aws';

export interface BedrockChatModelOverrides {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown; // 그 외 ChatBedrockConverse 생성 필드 passthrough
}

export interface BedrockChatModelCreateOptions extends BedrockChatModelOverrides {
  model: string; // 필수 — 라이브러리는 model을 임의로 정하지 않음
}

export interface BedrockConnection {
  region: string;
  credentials?: unknown;
}

export class BedrockChatModelFactory {
  constructor(private readonly connection: BedrockConnection) {}

  create(options: BedrockChatModelCreateOptions): ChatBedrockConverse {
    const { model, temperature, ...rest } = options;
    const config: Record<string, unknown> = {
      model, // 필수, fallback 없음
      region: this.connection.region,
      temperature: temperature ?? 0, // 호출 단위 중립 기본값(model과 무관)
      ...rest,
    };

    if (this.connection.credentials) {
      config.credentials = this.connection.credentials;
    }

    return new (ChatBedrockConverse as ChatBedrockConverseConstructor)(config);
  }
}

type ChatBedrockConverseConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatBedrockConverse>;
