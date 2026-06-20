import { DynamicModule, Module } from '@nestjs/common';
import { ChatBedrockConverse } from '@langchain/aws';

import { NEST_LANGCHAIN_BEDROCK_CHAT_MODEL } from './tokens';

export interface BedrockProviderOptions {
  credentials?: unknown;
  model?: string;
  region?: string;
  temperature?: number;
}

@Module({})
export class BedrockProviderModule {
  static forRoot(options: BedrockProviderOptions = {}): DynamicModule {
    return {
      module: BedrockProviderModule,
      providers: [
        {
          provide: NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
          useFactory: () => {
            const region =
              options.region ??
              process.env.AWS_REGION ??
              process.env.AWS_DEFAULT_REGION;

            if (!region) {
              throw new Error('AWS region is required.');
            }

            const config: Record<string, unknown> = {
              model:
                options.model ??
                'anthropic.claude-3-5-sonnet-20240620-v1:0',
              region,
              temperature: options.temperature ?? 0,
            };

            if (options.credentials) {
              config.credentials = options.credentials;
            }

            return new (ChatBedrockConverse as ChatBedrockConverseConstructor)(
              config,
            );
          },
        },
      ],
      exports: [NEST_LANGCHAIN_BEDROCK_CHAT_MODEL],
    };
  }
}

type ChatBedrockConverseConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatBedrockConverse>;
