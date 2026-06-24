# @nest-langchain/visualization

Hosted graph documentation for Nest LangChain registries.

This package mounts a Swagger-like graph UI and machine-readable graph endpoints
inside a Nest application. It reads graph/runnable metadata from
`@nest-langchain/core` and can store layout positions in memory, files, browser
storage, or a custom storage backend.

## Install

```bash
pnpm add @nest-langchain/core @nest-langchain/visualization
```

## Setup

```ts
import { NestFactory } from '@nestjs/core';
import {
  FileLayoutStorage,
  VisualizationModule,
} from '@nest-langchain/visualization';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(3000);
}
```

Use `BrowserLayoutStorage` when layout edits should stay client-side:

```ts
VisualizationModule.setup(
  '/ai/graphs',
  app,
  { title: 'AI Graphs' },
  {
    editable: true,
    layout: {
      storage: new BrowserLayoutStorage('nest-langchain:layout:'),
    },
  },
);
```

## Endpoints

- `GET /ai/graphs`
- `GET /ai/graphs/json`
- `GET /ai/graphs/mermaid`
- `GET /ai/graphs/dot`
- `GET /ai/graphs/layouts/:graphId`
- `PUT /ai/graphs/layouts/:graphId`

Layout edits do not rewrite graph source files. Shared layouts should use
sidecar storage, and production persistence can implement
`VisualGraphLayoutStorage`.

## Demo

```bash
pnpm --filter @nest-langchain/demo-visualization start

curl "http://localhost:3000/ai/graphs/json"
curl "http://localhost:3000/ai/graphs/mermaid"
curl -X POST "http://localhost:3000/graphs/support-workflow" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late for an enterprise customer.","customerTier":"enterprise"}'
```

Open `http://localhost:3000/ai/graphs` in a browser to inspect and edit the
graph layout.

## Boundary

- Peers against `@nest-langchain/core` because it reads registry metadata.
- Does not depend on LangGraph directly; any runnable or graph registered in
  core can be documented.
- Keeps layout state outside source files.
