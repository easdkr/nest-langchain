# Visualization

`@nest-langchain/visualization` hosts graph documentation on the Nest server, similar to Swagger UI.

```ts
VisualizationModule.setup(
  '/ai/graphs',
  app,
  {
    title: 'AI Graphs',
  },
  {
    editable: true,
    layout: {
      storage: new FileLayoutStorage('.nest-langchain/layouts'),
    },
  },
);
```

Default endpoints:

- `GET /ai/graphs`: HTML UI
- `GET /ai/graphs/json`: `VisualizationDocument`
- `GET /ai/graphs/mermaid`: Mermaid source
- `GET /ai/graphs/dot`: DOT source
- `GET /ai/graphs/layouts/:graphId`: saved layout
- `PUT /ai/graphs/layouts/:graphId`: save layout when editable mode is enabled

Layout state is separate from execution graph code. Editing node positions saves `VisualGraphLayout` through a storage adapter and does not rewrite `.ts` graph definitions.
