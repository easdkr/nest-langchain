import type { DynamicModule, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';

import { PROMPTS_MODULE_OPTIONS } from './constants';
import type { PromptsModuleOptions } from './interfaces';
import { PromptRegistry } from './prompt.registry';

const registryProvider: Provider = {
  provide: PromptRegistry,
  useFactory: (options: PromptsModuleOptions = {}) => {
    const registry = new PromptRegistry();

    for (const prompt of options.prompts ?? []) {
      registry.registerPrompt(prompt);
    }

    return registry;
  },
  inject: [PROMPTS_MODULE_OPTIONS],
};

@Module({})
export class PromptsModule {
  static forRoot(options: PromptsModuleOptions = {}): DynamicModule {
    return {
      module: PromptsModule,
      global: options.global ?? false,
      providers: [
        {
          provide: PROMPTS_MODULE_OPTIONS,
          useValue: options,
        },
        registryProvider,
      ],
      exports: [PromptRegistry],
    };
  }
}
