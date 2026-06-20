import { DynamicModule, Inject, Module, OnModuleInit } from '@nestjs/common';

import { LANG_SMITH_OPTIONS } from './constants';
import type { LangSmithOptions } from './interfaces';
import { LangSmithContext } from './langsmith.context';
import { LangSmithEnvironment } from './langsmith.environment';
import { configureLangSmithRuntime } from './langsmith.runtime';

@Module({})
export class LangSmithModule implements OnModuleInit {
  constructor(
    private readonly environment: LangSmithEnvironment,
    @Inject(LANG_SMITH_OPTIONS)
    private readonly options: LangSmithOptions,
  ) {}

  static forRoot(options: LangSmithOptions = {}): DynamicModule {
    return {
      module: LangSmithModule,
      providers: [
        {
          provide: LANG_SMITH_OPTIONS,
          useValue: {
            enabled: false,
            ...options,
          },
        },
        LangSmithEnvironment,
        LangSmithContext,
      ],
      exports: [LANG_SMITH_OPTIONS, LangSmithEnvironment, LangSmithContext],
    };
  }

  onModuleInit(): void {
    this.environment.apply();
    configureLangSmithRuntime(this.options);
  }
}
