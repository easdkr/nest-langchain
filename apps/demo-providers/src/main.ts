import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3006);

  await app.listen(port);

  console.log(
    `nest-langchain providers demo listening on http://localhost:${port}`,
  );
}

void bootstrap();
