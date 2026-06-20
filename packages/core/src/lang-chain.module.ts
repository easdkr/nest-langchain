import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { LANG_CHAIN_OPTIONS } from './constants';
import type {
  LangChainModuleAsyncOptions,
  LangChainModuleOptions,
} from './interfaces';
import { LangChainExplorer } from './lang-chain.explorer';
import { LangChainRegistry } from './lang-chain.registry';
import { LangSmithEnvironment } from './lang-smith.environment';

@Module({})
export class LangChainModule {
  static forRoot(options: LangChainModuleOptions = {}): DynamicModule {
    return {
      module: LangChainModule,
      global: options.global ?? false,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: LANG_CHAIN_OPTIONS,
          useValue: normalizeOptions(options),
        },
        LangChainRegistry,
        LangSmithEnvironment,
        LangChainExplorer,
      ],
      exports: [LANG_CHAIN_OPTIONS, LangChainRegistry, LangSmithEnvironment],
    };
  }

  static forRootAsync(options: LangChainModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: LANG_CHAIN_OPTIONS,
      useFactory: async (...args: unknown[]) =>
        normalizeOptions(await options.useFactory(...args)),
      inject: options.inject ?? [],
    };

    return {
      module: LangChainModule,
      global: options.global ?? false,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        optionsProvider,
        LangChainRegistry,
        LangSmithEnvironment,
        LangChainExplorer,
        ...(options.extraProviders ?? []),
      ],
      exports: [LANG_CHAIN_OPTIONS, LangChainRegistry, LangSmithEnvironment],
    };
  }
}

function normalizeOptions(
  options: LangChainModuleOptions,
): LangChainModuleOptions {
  return {
    autoDiscoverGraphs: true,
    ...options,
    langSmith: options.langSmith
      ? {
          ...options.langSmith,
          enabled: options.langSmith.enabled ?? false,
        }
      : undefined,
  };
}

