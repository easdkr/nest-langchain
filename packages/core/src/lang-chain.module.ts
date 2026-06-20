import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { LANG_CHAIN_OPTIONS } from './constants';
import type {
  LangChainModuleAsyncOptions,
  LangChainModuleOptions,
} from './interfaces';
import { LangChainRegistry } from './lang-chain.registry';
import { DecoratedProviderScanner } from './provider-scanner';

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
        DecoratedProviderScanner,
      ],
      exports: [LANG_CHAIN_OPTIONS, LangChainRegistry, DecoratedProviderScanner],
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
        DecoratedProviderScanner,
        ...(options.extraProviders ?? []),
      ],
      exports: [LANG_CHAIN_OPTIONS, LangChainRegistry, DecoratedProviderScanner],
    };
  }
}

function normalizeOptions(
  options: LangChainModuleOptions,
): LangChainModuleOptions {
  return {
    ...options,
  };
}
