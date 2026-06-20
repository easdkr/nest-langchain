import { DynamicModule, Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { NEST_LANGCHAIN_OPENAI_CHAT_MODEL } from './tokens';

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

@Module({})
export class OpenAIProviderModule {
  static forRoot(options: OpenAIProviderOptions = {}): DynamicModule {
    return {
      module: OpenAIProviderModule,
      providers: [
        {
          provide: NEST_LANGCHAIN_OPENAI_CHAT_MODEL,
          useFactory: () =>
            new ChatOpenAI({
              apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
              model: options.model ?? 'gpt-4.1-mini',
              temperature: options.temperature ?? 0,
            }),
        },
      ],
      exports: [NEST_LANGCHAIN_OPENAI_CHAT_MODEL],
    };
  }
}

