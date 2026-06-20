import { DynamicModule, Module } from '@nestjs/common';
import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput,
} from '@langchain/google-genai';

import { NEST_LANGCHAIN_GEMINI_CHAT_MODEL } from './tokens';

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

@Module({})
export class GeminiProviderModule {
  static forRoot(options: GeminiProviderOptions = {}): DynamicModule {
    return {
      module: GeminiProviderModule,
      providers: [
        {
          provide: NEST_LANGCHAIN_GEMINI_CHAT_MODEL,
          useFactory: () => {
            const apiKey =
              options.apiKey ??
              process.env.GOOGLE_API_KEY ??
              process.env.GEMINI_API_KEY;

            if (!apiKey) {
              throw new Error('Gemini API key is required.');
            }

            const config: GoogleGenerativeAIChatInput = {
              apiKey,
              model: options.model ?? 'gemini-2.5-flash',
              temperature: options.temperature ?? 0,
            };

            return new ChatGoogleGenerativeAI(config);
          },
        },
      ],
      exports: [NEST_LANGCHAIN_GEMINI_CHAT_MODEL],
    };
  }
}
