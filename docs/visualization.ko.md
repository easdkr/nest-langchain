# Visualization

[English](visualization.md) | [한국어](visualization.ko.md)

`@nest-langchain/visualization`은 Swagger UI와 비슷하게 Nest server 위에서 graph documentation을 호스팅합니다.

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
- `PUT /ai/graphs/layouts/:graphId`: editable mode가 켜졌을 때 layout 저장

Layout state는 execution graph code와 분리됩니다. Node position을 편집하면 `VisualGraphLayout`이 storage adapter를 통해 저장되며 `.ts` graph definition을 다시 쓰지 않습니다.

## Layout Storage

Read-only mode가 기본입니다. Editable mode에는 명시적인 storage strategy가 필요합니다.

```ts
new ReadOnlyLayoutStorage(); // no save support
new BrowserLayoutStorage('nest-langchain:layout:'); // browser localStorage
new FileLayoutStorage('.nest-langchain/layouts'); // sidecar JSON files
```

Database-backed storage를 원하면 `VisualGraphLayoutStorage`를 구현합니다.

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

`BrowserLayoutStorage`는 layout을 user browser의 `localStorage`에 보관합니다. Server에 쓰지 않으며 repository diff도 만들지 않습니다.
