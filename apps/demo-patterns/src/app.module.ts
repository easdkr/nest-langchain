import { Module } from "@nestjs/common";
import { CollaborativePatternsModule } from "@nest-langchain/patterns";

import { AppController } from "./app.controller";
import { DeterministicChatModel } from "./models/deterministic-chat.model";
import { LaunchReviewTask } from "./tasks/launch-review.task";
import { CRITIC_MODEL, JUDGE_MODEL, PLANNER_MODEL } from "./tokens";

@Module({
  imports: [
    CollaborativePatternsModule.forRoot({
      autoDiscoverDeepAgents: false,
    }),
  ],
  controllers: [AppController],
  providers: [
    LaunchReviewTask,
    {
      provide: PLANNER_MODEL,
      useValue: new DeterministicChatModel("planner"),
    },
    {
      provide: CRITIC_MODEL,
      useValue: new DeterministicChatModel("critic"),
    },
    {
      provide: JUDGE_MODEL,
      useValue: new DeterministicChatModel("judge"),
    },
  ],
})
export class AppModule {}
