import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';

import { LANG_SMITH_OPTIONS } from './constants';
import type { LangSmithOptions } from './interfaces';
import { LangSmithEnvironment } from './langsmith.environment';

@Module({})
export class LangSmithModule implements OnModuleInit {
  constructor(private readonly environment: LangSmithEnvironment) {}

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
      ],
      exports: [LANG_SMITH_OPTIONS, LangSmithEnvironment],
    };
  }

  onModuleInit(): void {
    this.environment.apply();
  }
}

