import { describe, expect, it } from 'vitest';

import {
  BrowserLayoutStorage,
  MemoryLayoutStorage,
} from '../src/layout-storage';
import { renderHtml, renderMermaid } from '../src/renderers';
import type { VisualizationDocument } from '../src/interfaces';

describe('visualization renderers and storage', () => {
  const document: VisualizationDocument = {
    title: 'AI Graphs',
    generatedAt: '2026-06-20T00:00:00.000Z',
    graphs: [
      {
        id: 'joke',
        label: 'joke',
        nodes: [
          { id: 'joke:draft', label: 'draft', kind: 'node' },
          { id: 'joke:localize', label: 'localize', kind: 'node' },
        ],
        edges: [{ from: 'joke:draft', to: 'joke:localize', kind: 'normal' }],
      },
    ],
  };

  it('renders a stable Mermaid flowchart', () => {
    expect(renderMermaid(document)).toContain('flowchart LR');
    expect(renderMermaid(document)).toContain('joke_draft');
    expect(renderMermaid(document)).toContain('-->|normal|');
  });

  it('stores layout state separately from graph metadata', async () => {
    const storage = new MemoryLayoutStorage();

    await storage.save('joke', {
      graphId: 'joke',
      version: '1',
      nodes: {
        draft: {
          x: 10,
          y: 20,
          pinned: true,
        },
      },
    });

    await expect(storage.get('joke')).resolves.toMatchObject({
      graphId: 'joke',
      nodes: {
        draft: {
          x: 10,
          y: 20,
          pinned: true,
        },
      },
    });
  });

  it('renders browser-local editable layout controls without server persistence', () => {
    const html = renderHtml(document, '/ai/graphs', {
      editable: true,
      layoutStorage: new BrowserLayoutStorage('nest-langchain:layout:'),
    });

    expect(html).toContain('localStorage');
    expect(html).toContain('nest-langchain:layout:');
    expect(html).toContain('draggable="true"');
    expect(html).toContain('data-node-id="joke:draft"');
  });
});
