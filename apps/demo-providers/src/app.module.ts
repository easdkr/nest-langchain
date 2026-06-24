import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { buildProviderImports } from './provider-catalog';

@Module({
  imports: buildProviderImports(),
  controllers: [AppController],
})
export class AppModule {}
