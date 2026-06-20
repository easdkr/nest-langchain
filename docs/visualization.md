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

## Layout Storage

Read-only mode is the default. Editable mode needs an explicit storage strategy.

```ts
new ReadOnlyLayoutStorage(); // no save support
new BrowserLayoutStorage('nest-langchain:layout:'); // browser localStorage
new FileLayoutStorage('.nest-langchain/layouts'); // sidecar JSON files
```

For database-backed storage, implement `VisualGraphLayoutStorage`.

```ts
class DatabaseLayoutStorage implements VisualGraphLayoutStorage {
  get(graphId: string) {
    return db.graphLayouts.findByGraphId(graphId);
  }

  save(graphId: string, layout: VisualGraphLayout) {
    return db.graphLayouts.upsert(graphId, layout);
  }
}
```

`BrowserLayoutStorage` keeps layout in the user's browser with `localStorage`; it does not write to the server and does not create a repository diff.
