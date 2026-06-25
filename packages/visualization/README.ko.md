# @nest-langchain/visualization

[English](README.md) | [한국어](README.ko.md)

Nest LangChain registry를 위한 hosted graph documentation입니다.

이 패키지는 Swagger와 비슷한 graph UI와 machine-readable graph endpoint를 Nest application 안에 mount합니다. `@nest-langchain/core`의 graph/runnable metadata를 읽고 layout position을 memory, file, browser storage, custom storage backend에 저장할 수 있습니다.

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

Layout edit를 client-side에만 두려면 `BrowserLayoutStorage`를 사용합니다.

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

Layout edit는 graph source file을 다시 쓰지 않습니다. Shared layout은 sidecar storage를 사용하는 것이 좋고, production persistence는 `VisualGraphLayoutStorage`를 구현하면 됩니다.

## Demo

```bash
pnpm --filter @nest-langchain/demo-visualization start

curl "http://localhost:3000/ai/graphs/json"
curl "http://localhost:3000/ai/graphs/mermaid"
curl -X POST "http://localhost:3000/graphs/support-workflow" \
  -H "content-type: application/json" \
  -d '{"message":"Delivery tracking is late for an enterprise customer.","customerTier":"enterprise"}'
```

Browser에서 `http://localhost:3000/ai/graphs`를 열면 graph layout을 inspect하고 edit할 수 있습니다.
