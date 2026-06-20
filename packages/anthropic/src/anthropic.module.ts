import { DynamicModule, Module } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';

import { NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL } from './tokens';

export interface AnthropicProviderOptions {
  apiKey?: string;
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
            const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;

            if (!apiKey) {
              throw new Error('Anthropic API key is required.');
            }

            return new (ChatAnthropic as ChatAnthropicConstructor)({
              apiKey,
              model: options.model ?? 'claude-3-5-sonnet-latest',
              temperature: options.temperature ?? 0,
            });
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
