import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

import type { LangSmithTraceMetadata } from './interfaces';

const storage = new AsyncLocalStorage<LangSmithTraceMetadata>();

@Injectable()
export class LangSmithContext {
  static run<T>(metadata: LangSmithTraceMetadata, callback: () => T): T {
    return storage.run(
      {
        ...LangSmithContext.current(),
        ...metadata,
      },
      callback,
    );
  }

  static current(): LangSmithTraceMetadata {
    return storage.getStore() ?? {};
  }

  run<T>(metadata: LangSmithTraceMetadata, callback: () => T): T {
    return LangSmithContext.run(metadata, callback);
  }

  current(): LangSmithTraceMetadata {
    return LangSmithContext.current();
  }
}
