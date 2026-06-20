import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { VisualGraphLayout, VisualGraphLayoutStorage } from './interfaces';

export class ReadOnlyLayoutStorage implements VisualGraphLayoutStorage {
  async get(): Promise<undefined> {
    return undefined;
  }

  async save(): Promise<void> {
    throw new Error('Layout storage is read-only.');
  }
}

export class MemoryLayoutStorage implements VisualGraphLayoutStorage {
  private readonly layouts = new Map<string, VisualGraphLayout>();

  async get(graphId: string): Promise<VisualGraphLayout | undefined> {
    return this.layouts.get(graphId);
  }

  async save(graphId: string, layout: VisualGraphLayout): Promise<void> {
    this.layouts.set(graphId, layout);
  }
}

export class BrowserLayoutStorage implements VisualGraphLayoutStorage {
  readonly kind = 'browser';

  constructor(readonly keyPrefix = 'nest-langchain:layout:') {}

  async get(): Promise<undefined> {
    return undefined;
  }

  async save(): Promise<void> {
    throw new Error('Browser layout storage is client-side only.');
  }
}

export class FileLayoutStorage implements VisualGraphLayoutStorage {
  constructor(private readonly directory: string) {}

  async get(graphId: string): Promise<VisualGraphLayout | undefined> {
    try {
      const content = await readFile(this.pathFor(graphId), 'utf8');
      return JSON.parse(content) as VisualGraphLayout;
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async save(graphId: string, layout: VisualGraphLayout): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(
      this.pathFor(graphId),
      `${JSON.stringify({ ...layout, graphId }, null, 2)}\n`,
      'utf8',
    );
  }

  private pathFor(graphId: string): string {
    return join(this.directory, `${sanitizeGraphId(graphId)}.json`);
  }
}

export function isBrowserLayoutStorage(
  storage: VisualGraphLayoutStorage,
): storage is BrowserLayoutStorage {
  return storage instanceof BrowserLayoutStorage;
}

function sanitizeGraphId(graphId: string): string {
  return graphId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
