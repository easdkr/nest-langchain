import { describe, expect, it } from 'vitest';

import type { NestApplicationLike } from '../src/interfaces';
import { VisualizationModule } from '../src/visualization.module';

describe('VisualizationModule.setup', () => {
  it('does not register the hosted HTML route when ui is disabled', () => {
    const http = new FakeHttpServer();
    const app = {
      get: () => ({
        listRunnables: () => [],
      }),
      getHttpAdapter: () => ({
        getInstance: () => http,
      }),
    } as unknown as NestApplicationLike;

    VisualizationModule.setup(
      '/ai/graphs',
      app,
      {
        title: 'AI Graphs',
      },
      {
        ui: false,
      },
    );

    expect(http.hasGet('/ai/graphs')).toBe(false);
    expect(http.hasGet('/ai/graphs/json')).toBe(true);
  });
});

class FakeHttpServer {
  private readonly getRoutes = new Set<string>();

  get(path: string) {
    this.getRoutes.add(path);
  }

  put() {
    return undefined;
  }

  hasGet(path: string): boolean {
    return this.getRoutes.has(path);
  }
}
