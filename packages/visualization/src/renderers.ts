import type {
  VisualizationDocument,
  VisualGraph,
  VisualGraphLayoutStorage,
} from './interfaces';
import { isBrowserLayoutStorage } from './layout-storage';

export interface RenderHtmlOptions {
  editable?: boolean;
  layoutStorage?: VisualGraphLayoutStorage;
}

export function renderMermaid(document: VisualizationDocument): string {
  return document.graphs.map(renderGraphMermaid).join('\n\n');
}

export function renderDot(document: VisualizationDocument): string {
  const lines = ['digraph NestLangChain {', '  rankdir=LR;'];

  for (const graph of document.graphs) {
    lines.push(`  subgraph "cluster_${escapeDotId(graph.id)}" {`);
    lines.push(`    label="${escapeDot(graph.label)}";`);

    for (const node of graph.nodes) {
      lines.push(
        `    "${escapeDotId(node.id)}" [label="${escapeDot(node.label)}"];`,
      );
    }

    for (const edge of graph.edges) {
      lines.push(
        `    "${escapeDotId(edge.from)}" -> "${escapeDotId(edge.to)}" [label="${escapeDot(edge.label ?? edge.kind)}"];`,
      );
    }

    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

export function renderHtml(
  document: VisualizationDocument,
  basePath: string,
  options: RenderHtmlOptions = {},
): string {
  const title = escapeHtml(document.title);
  const normalizedBasePath = normalizeBasePath(basePath);
  const browserLayout =
    options.layoutStorage && isBrowserLayoutStorage(options.layoutStorage)
      ? options.layoutStorage
      : undefined;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fa; color: #1f2933; }
      header { padding: 20px 28px; background: #111827; color: #fff; }
      main { padding: 24px 28px; display: grid; gap: 18px; }
      section { background: #fff; border: 1px solid #d8dee8; border-radius: 8px; padding: 16px; }
      h1 { margin: 0; font-size: 22px; }
      h2 { margin: 0 0 12px; font-size: 17px; }
      pre { overflow: auto; background: #0f172a; color: #e5e7eb; padding: 14px; border-radius: 6px; }
      .node { display: inline-flex; margin: 4px; padding: 5px 8px; border: 1px solid #94a3b8; border-radius: 6px; background: #f8fafc; position: relative; }
      .node[draggable="true"] { cursor: grab; }
      .links a { margin-right: 12px; color: #2563eb; }
    </style>
  </head>
  <body>
    <header>
      <h1>${title}</h1>
      <div>${document.graphs.length} graph(s), generated ${escapeHtml(document.generatedAt)}</div>
    </header>
    <main>
      <section class="links">
        <a href="${normalizedBasePath}/json">JSON</a>
        <a href="${normalizedBasePath}/mermaid">Mermaid</a>
        <a href="${normalizedBasePath}/dot">DOT</a>
      </section>
      ${document.graphs.map((graph) => renderGraphSection(graph, options)).join('\n')}
    </main>
    ${renderBrowserLayoutScript(options.editable === true, browserLayout?.keyPrefix)}
  </body>
</html>`;
}

function renderGraphMermaid(graph: VisualGraph): string {
  const lines = [
    `flowchart LR`,
    `  subgraph ${safeMermaidId(graph.id)}["${escapeMermaid(graph.label)}"]`,
  ];

  for (const node of graph.nodes) {
    lines.push(`    ${safeMermaidId(node.id)}["${escapeMermaid(node.label)}"]`);
  }

  for (const edge of graph.edges) {
    lines.push(
      `    ${safeMermaidId(edge.from)} -->|${escapeMermaid(edge.label ?? edge.kind)}| ${safeMermaidId(edge.to)}`,
    );
  }

  lines.push('  end');
  return lines.join('\n');
}

function renderGraphSection(
  graph: VisualGraph,
  options: RenderHtmlOptions,
): string {
  const draggable = options.editable === true ? ' draggable="true"' : '';

  return `<section data-graph-id="${escapeHtml(graph.id)}">
  <h2>${escapeHtml(graph.label)}</h2>
  <div>${graph.nodes
    .map(
      (node) =>
        `<span class="node" data-node-id="${escapeHtml(node.id)}"${draggable}>${escapeHtml(node.label)}</span>`,
    )
    .join('')}</div>
  <pre>${escapeHtml(renderGraphMermaid(graph))}</pre>
</section>`;
}

function renderBrowserLayoutScript(
  editable: boolean,
  keyPrefix: string | undefined,
): string {
  if (!editable || !keyPrefix) {
    return '';
  }

  return `<script>
(() => {
  const keyPrefix = ${JSON.stringify(keyPrefix)};

  for (const section of document.querySelectorAll('[data-graph-id]')) {
    const graphId = section.getAttribute('data-graph-id');
    const storageKey = keyPrefix + graphId;
    const layout = readLayout(storageKey, graphId);

    for (const node of section.querySelectorAll('[data-node-id]')) {
      const nodeId = node.getAttribute('data-node-id');
      const saved = layout.nodes[nodeId];

      if (saved) {
        node.style.transform = \`translate(\${saved.x}px, \${saved.y}px)\`;
      }

      node.addEventListener('dragend', (event) => {
        layout.nodes[nodeId] = {
          x: event.clientX,
          y: event.clientY,
          pinned: true,
        };
        localStorage.setItem(storageKey, JSON.stringify(layout));
      });
    }
  }

  function readLayout(storageKey, graphId) {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {
        graphId,
        version: '1',
        nodes: {},
      };
    } catch {
      return {
        graphId,
        version: '1',
        nodes: {},
      };
    }
  }
})();
</script>`;
}

function normalizeBasePath(basePath: string): string {
  return basePath === '/' ? '' : basePath.replace(/\/$/, '');
}

function safeMermaidId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeMermaid(value: string): string {
  return value.replace(/"/g, '#quot;');
}

function escapeDotId(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapeDot(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
