# @nest-langchain/visualization

Nest 서버의 특정 path에 AI graph 문서 UI와 machine-readable graph endpoint를 붙이는 선택 패키지입니다.

```bash
pnpm add @nest-langchain/core @nest-langchain/visualization
```

```ts
const document = VisualizationModule.createDocument(app, {
  title: 'AI Graphs',
});

VisualizationModule.setup('/ai/graphs', app, document, {
  editable: true,
  layout: {
    storage: new FileLayoutStorage('.nest-langchain/layouts'),
  },
});
```

기본 endpoint:

- `GET /ai/graphs`
- `GET /ai/graphs/json`
- `GET /ai/graphs/mermaid`
- `GET /ai/graphs/dot`
- `GET /ai/graphs/layouts/:graphId`
- `PUT /ai/graphs/layouts/:graphId`

Layout 변경은 실행 graph source file을 수정하지 않습니다. 공용 layout이 필요하면 sidecar JSON storage를 선택합니다.

