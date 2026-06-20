import { DynamicModule, Module } from "@nestjs/common";
import { ChatAnthropic } from "@langchain/anthropic";

import { NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL } from "./tokens";

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  anthropicApiUrl?: string;
  model?: string;
  temperature?: number;
}

@Module({})
export class AnthropicProviderModule {
  static forRoot(options: AnthropicProviderOptions = {}): DynamicModule {
    return {
      module: AnthropicProviderModule,
      providers: [
        {
          provide: NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
          useFactory: () => {
            const apiKey = firstNonEmpty(
              options.apiKey,
              process.env.ANTHROPIC_API_KEY,
              process.env.CLAUDE_API_KEY,
            );

            if (!apiKey) {
              throw new Error("Anthropic API key is required.");
            }

            const anthropicApiUrl = firstNonEmpty(
              options.anthropicApiUrl,
              options.baseUrl,
              process.env.ANTHROPIC_BASE_URL,
            );
            const config: Record<string, unknown> = {
              apiKey,
              model: options.model ?? "claude-haiku-4-5-20251001",
              temperature: options.temperature ?? 0,
            };

            if (anthropicApiUrl) {
              config.anthropicApiUrl = anthropicApiUrl;
            }

            return new (ChatAnthropic as ChatAnthropicConstructor)(config);
          },
        },
      ],
      exports: [NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL],
    };
  }
}

type ChatAnthropicConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatAnthropic>;

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}
