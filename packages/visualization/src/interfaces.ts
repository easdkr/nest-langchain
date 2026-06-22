import type { INestApplication } from '@nestjs/common';

export type VisualNodeKind =
  | 'graph'
  | 'node'
  | 'tool'
  | 'model'
  | 'retriever'
  | 'chain';

export type VisualEdgeKind =
  | 'entry'
  | 'finish'
  | 'normal'
  | 'conditional'
  | 'calls'
  | 'uses';

export interface VisualGraph {
  id: string;
  label: string;
  nodes: Array<{
    id: string;
    label: string;
    kind: VisualNodeKind;
    packageName?: string;
    metadata?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    kind: VisualEdgeKind;
    condition?: string;
  }>;
}

export interface VisualGraphLayout {
  graphId: string;
  version: string;
  nodes: Record<
    string,
    {
      x: number;
      y: number;
      pinned?: boolean;
      width?: number;
      height?: number;
    }
  >;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface VisualizationDocument {
  title: string;
  generatedAt: string;
  graphs: VisualGraph[];
}

export interface CreateVisualizationDocumentOptions {
  title?: string;
  include?: unknown[];
}

export interface VisualizationLayoutOptions {
  storage?: VisualGraphLayoutStorage;
}

export interface VisualizationSetupOptions {
  ui?: boolean;
  editable?: boolean;
  jsonPath?: string;
  mermaidPath?: string;
  dotPath?: string;
  layout?: VisualizationLayoutOptions;
}

export interface VisualGraphLayoutStorage {
  get(graphId: string): Promise<VisualGraphLayout | undefined>;
  save(graphId: string, layout: VisualGraphLayout): Promise<void>;
}

export type NestApplicationLike = Pick<
  INestApplication,
  'get' | 'getHttpAdapter'
>;
