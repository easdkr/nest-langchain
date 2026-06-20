import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import {
  FileLayoutStorage,
  VisualizationModule,
} from '@nest-langchain/visualization';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);

  VisualizationModule.setup(
    '/ai/graphs',
    app,
    {
      title: 'Nest LangChain Demo Graphs',
    },
    {
      editable: true,
      layout: {
        storage: new FileLayoutStorage('.nest-langchain/layouts'),
      },
    },
  );

  await app.listen(port);

  console.log(
    `nest-langchain visualization demo listening on http://localhost:${port}/ai/graphs`,
  );
}

void bootstrap();
