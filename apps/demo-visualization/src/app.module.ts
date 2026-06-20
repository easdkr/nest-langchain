import { Module } from '@nestjs/common';
import { LangGraphModule } from '@nest-langchain/langgraph';

import { AppController } from './app.controller';
import { JokeGraph } from './graphs/joke.graph';

@Module({
  imports: [LangGraphModule.forRoot({ global: true })],
  controllers: [AppController],
  providers: [JokeGraph],
})
export class AppModule {}

