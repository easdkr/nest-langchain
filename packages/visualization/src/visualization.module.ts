import { Module } from '@nestjs/common';
import { LangChainRegistry } from '@nest-langchain/core';

import type {
  CreateVisualizationDocumentOptions,
  NestApplicationLike,
  VisualizationDocument,
  VisualizationSetupOptions,
  VisualGraph,
  VisualGraphLayout,
  VisualGraphLayoutStorage,
  VisualNodeKind,
} from './interfaces';
import { isBrowserLayoutStorage, ReadOnlyLayoutStorage } from './layout-storage';
import { renderDot, renderHtml, renderMermaid } from './renderers';

@Module({})
export class VisualizationModule {
  static createDocument(
    app: NestApplicationLike,
    options: CreateVisualizationDocumentOptions = {},
  ): VisualizationDocument {
    const registry = app.get(LangChainRegistry, { strict: false });
    const runnables = registry.listRunnables();

    return {
      title: options.title ?? 'Nest LangChain Graphs',
      generatedAt: new Date().toISOString(),
      graphs: runnables.map((runnable): VisualGraph => {
        const nodes =
          runnable.nodes.length > 0
            ? runnable.nodes.map((node) => ({
                id: scopedId(runnable.name, node),
                label: node,
                kind: 'node' as VisualNodeKind,
                metadata: {
                  runnable: runnable.name,
                },
              }))
            : [
                {
                  id: runnable.name,
                  label: runnable.name,
                  kind: normalizeKind(runnable.kind),
                  metadata: runnable.metadata,
                },
              ];

        return {
          id: runnable.name,
          label: runnable.name,
          nodes,
          edges: runnable.edges.map(([from, to]) => ({
            from: scopedId(runnable.name, from),
            to: scopedId(runnable.name, to),
            kind: edgeKind(from, to),
          })),
        };
      }),
    };
  }

  static setup(
    path: string,
    app: NestApplicationLike,
    documentOrOptions: VisualizationDocument | CreateVisualizationDocumentOptions,
    options: VisualizationSetupOptions = {},
  ): void {
    const adapter = app.getHttpAdapter();
    const basePath = normalizePath(path);
    const jsonPath = joinPath(basePath, options.jsonPath ?? 'json');
    const mermaidPath = joinPath(basePath, options.mermaidPath ?? 'mermaid');
    const dotPath = joinPath(basePath, options.dotPath ?? 'dot');
    const layoutPath = joinPath(basePath, 'layouts/:graphId');
    const storage = options.layout?.storage ?? new ReadOnlyLayoutStorage();
    const getDocument = () =>
      isVisualizationDocument(documentOrOptions)
        ? documentOrOptions
        : VisualizationModule.createDocument(app, documentOrOptions);

    if (options.ui !== false) {
      registerGet(adapter, basePath, (_req, res) => {
        const document = getDocument();
        sendHtml(
          res,
          renderHtml(document, basePath, {
            editable: options.editable,
            layoutStorage: storage,
          }),
        );
      });
    }

    registerGet(adapter, jsonPath, (_req, res) => {
      sendJson(res, getDocument());
    });

    registerGet(adapter, mermaidPath, (_req, res) => {
      sendText(res, renderMermaid(getDocument()), 'text/plain');
    });

    registerGet(adapter, dotPath, (_req, res) => {
      sendText(res, renderDot(getDocument()), 'text/vnd.graphviz');
    });

    registerGet(adapter, layoutPath, async (req, res) => {
      const graphId = getParam(req, 'graphId');
      const layout = await storage.get(graphId);
      sendJson(res, layout ?? emptyLayout(graphId));
    });

    registerPut(adapter, layoutPath, async (req, res) => {
      if (!options.editable) {
        sendJson(res, { message: 'Layout editing is disabled.' }, 403);
        return;
      }

      const graphId = getParam(req, 'graphId');
      const body = typeof req.body === 'undefined' ? await readJsonBody(req) : req.body;
      const layout = normalizeLayout(graphId, body);

      if (isBrowserLayoutStorage(storage)) {
        sendJson(
          res,
          { message: 'Browser layout storage is client-side only.' },
          400,
        );
        return;
      }

      await saveLayout(storage, graphId, layout);
      sendJson(res, layout);
    });
  }
}

function normalizeKind(kind: string): VisualNodeKind {
  if (
    kind === 'graph' ||
    kind === 'chain' ||
    kind === 'tool' ||
    kind === 'model' ||
    kind === 'retriever'
  ) {
    return kind;
  }

  return 'chain';
}

function edgeKind(from: string, to: string): 'entry' | 'finish' | 'normal' {
  if (from === '__start__') {
    return 'entry';
  }

  if (to === '__end__') {
    return 'finish';
  }

  return 'normal';
}

function scopedId(graphId: string, nodeId: string): string {
  if (nodeId === '__start__' || nodeId === '__end__') {
    return nodeId;
  }

  return `${graphId}:${nodeId}`;
}

function normalizePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.replace(/\/$/, '') || '/';
}

function joinPath(basePath: string, childPath: string): string {
  return `${basePath.replace(/\/$/, '')}/${childPath.replace(/^\//, '')}`;
}

function registerGet(
  adapter: ReturnType<NestApplicationLike['getHttpAdapter']>,
  path: string,
  handler: (req: any, res: any) => unknown,
): void {
  const instance = getHttpInstance(adapter);
  instance.get(path, async (req: any, res: any) => handler(req, res));
}

function registerPut(
  adapter: ReturnType<NestApplicationLike['getHttpAdapter']>,
  path: string,
  handler: (req: any, res: any) => unknown,
): void {
  const instance = getHttpInstance(adapter);
  instance.put(path, async (req: any, res: any) => handler(req, res));
}

function getHttpInstance(
  adapter: ReturnType<NestApplicationLike['getHttpAdapter']>,
): any {
  return typeof adapter.getInstance === 'function' ? adapter.getInstance() : adapter;
}

function sendJson(res: any, body: unknown, status = 200): void {
  if (typeof res.status === 'function') {
    res.status(status);
  } else {
    res.statusCode = status;
  }

  if (typeof res.json === 'function') {
    res.json(body);
    return;
  }

  sendText(res, JSON.stringify(body), 'application/json');
}

function sendHtml(res: any, body: string): void {
  sendText(res, body, 'text/html; charset=utf-8');
}

function sendText(res: any, body: string, contentType: string): void {
  if (typeof res.type === 'function') {
    res.type(contentType);
  } else if (typeof res.setHeader === 'function') {
    res.setHeader('content-type', contentType);
  }

  if (typeof res.send === 'function') {
    res.send(body);
    return;
  }

  res.end(body);
}

function getParam(req: any, key: string): string {
  return req.params?.[key] ?? req.param?.(key);
}

function normalizeLayout(graphId: string, value: unknown): VisualGraphLayout {
  if (!isRecord(value)) {
    return emptyLayout(graphId);
  }

  return {
    graphId,
    version: typeof value.version === 'string' ? value.version : '1',
    nodes: isRecord(value.nodes) ? (value.nodes as VisualGraphLayout['nodes']) : {},
    viewport: isRecord(value.viewport)
      ? (value.viewport as VisualGraphLayout['viewport'])
      : undefined,
  };
}

function emptyLayout(graphId: string): VisualGraphLayout {
  return {
    graphId,
    version: '1',
    nodes: {},
  };
}

async function saveLayout(
  storage: VisualGraphLayoutStorage,
  graphId: string,
  layout: VisualGraphLayout,
): Promise<void> {
  await storage.save(graphId, layout);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVisualizationDocument(
  value: VisualizationDocument | CreateVisualizationDocumentOptions,
): value is VisualizationDocument {
  return isRecord(value) && Array.isArray(value.graphs);
}

async function readJsonBody(req: any): Promise<unknown> {
  if (!req || typeof req.on !== 'function') {
    return undefined;
  }

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve());
    req.on('error', reject);
  });

  if (chunks.length === 0) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}
