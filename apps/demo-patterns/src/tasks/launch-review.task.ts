import { Injectable } from "@nestjs/common";
import {
  CollaborativeTask,
  TaskStep,
  type TaskExecutionContext,
} from "@nest-langchain/patterns";

import { CRITIC_MODEL, JUDGE_MODEL, PLANNER_MODEL } from "../tokens";

interface LaunchReviewInput {
  product: string;
  market: string;
}

@CollaborativeTask({
  name: "launch-review",
  description: "Draft, critique, score, and decide a product launch.",
  models: [
    { role: "planner", token: PLANNER_MODEL },
    { role: "critic", token: CRITIC_MODEL },
    { role: "judge", token: JUDGE_MODEL },
  ],
  tags: ["demo", "collaboration"],
})
@Injectable()
export class LaunchReviewTask {
  @TaskStep({
    name: "drafts",
    pattern: "parallel",
    models: ["planner", "critic"],
  })
  drafts(input: LaunchReviewInput) {
    return `Draft a launch plan for ${input.product} in ${input.market}.`;
  }

  @TaskStep({
    name: "score",
    pattern: "tool-call",
    model: "critic",
    dependsOn: ["drafts"],
    tools: [
      {
        name: "score_plan",
        description: "Score the launch plan from 1 to 10.",
        schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            reason: { type: "string" },
          },
          required: ["score", "reason"],
          additionalProperties: false,
        },
      },
    ],
    toolChoice: "any",
  })
  score(input: LaunchReviewInput, context: TaskExecutionContext) {
    return `Score launch drafts for ${input.product}: ${JSON.stringify(
      context.steps,
    )}`;
  }

  @TaskStep({
    name: "decision",
    pattern: "structured",
    model: "judge",
    dependsOn: ["score"],
    schemaName: "LaunchDecision",
    schema: {
      type: "object",
      properties: {
        decision: { type: "string" },
        owner: { type: "string" },
      },
      required: ["decision", "owner"],
      additionalProperties: false,
    },
  })
  decision(input: LaunchReviewInput, context: TaskExecutionContext) {
    return `Make the final launch decision for ${input.product}: ${JSON.stringify(
      context.steps,
    )}`;
  }
}
