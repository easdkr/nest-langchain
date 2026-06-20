import "reflect-metadata";

import { Inject, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { LangChainRegistry } from "@nest-langchain/core";
import { describe, expect, it } from "vitest";

import {
  CollaborativePatternsModule,
  CollaborativeTask,
  PatternsService,
  TaskStep,
} from "../src";

const PLANNER_MODEL = Symbol("planner-model");
const CRITIC_MODEL = Symbol("critic-model");
const JUDGE_MODEL = Symbol("judge-model");
const PRIMARY_MODEL = Symbol("primary-model");
const BACKUP_MODEL = Symbol("backup-model");

@CollaborativeTask({
  name: "launch-review",
  description: "Draft, critique, score, and finalize a launch plan.",
  models: [
    { role: "planner", token: PLANNER_MODEL },
    { role: "critic", token: CRITIC_MODEL },
    { role: "judge", token: JUDGE_MODEL },
  ],
  tags: ["demo", "collaboration"],
})
@Injectable()
class LaunchReviewTask {
  @TaskStep({
    name: "drafts",
    pattern: "parallel",
    models: ["planner", "critic"],
  })
  drafts(input: { product: string }) {
    return `Draft a launch plan for ${input.product}.`;
  }

  @TaskStep({
    name: "score",
    pattern: "tool-call",
    model: "critic",
    dependsOn: ["drafts"],
    tools: [
      {
        name: "score_plan",
        description: "Score a plan from 1 to 10.",
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
  score(input: { product: string }, context: Record<string, unknown>) {
    return `Score these drafts for ${input.product}: ${JSON.stringify(
      context.steps,
    )}`;
  }

  @TaskStep({
    name: "final",
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
  final(input: { product: string }, context: Record<string, unknown>) {
    return `Make the final launch decision for ${input.product}: ${JSON.stringify(
      context.steps,
    )}`;
  }
}

@CollaborativeTask({
  name: "fallback-answer",
  models: [
    { role: "primary", token: PRIMARY_MODEL },
    { role: "backup", token: BACKUP_MODEL },
  ],
})
@Injectable()
class FallbackTask {
  @TaskStep({
    name: "answer",
    pattern: "fallback",
    models: ["primary", "backup"],
  })
  answer(input: { question: string }) {
    return `Answer: ${input.question}`;
  }
}

describe("CollaborativePatternsModule", () => {
  it("registers a collaborative task that runs parallel, tool-call, and structured-output steps", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CollaborativePatternsModule.forRoot()],
      providers: [
        LaunchReviewTask,
        {
          provide: PLANNER_MODEL,
          useValue: new FakeChatModel("planner"),
        },
        {
          provide: CRITIC_MODEL,
          useValue: new FakeChatModel("critic"),
        },
        {
          provide: JUDGE_MODEL,
          useValue: new FakeChatModel("judge"),
        },
      ],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);
    const service = moduleRef.get(PatternsService);

    expect(service.listTasks()).toMatchObject([
      {
        name: "launch-review",
        nodes: ["drafts", "score", "final"],
        models: ["planner", "critic", "judge"],
      },
    ]);
    expect(registry.listRunnables()).toMatchObject([
      {
        name: "launch-review",
        kind: "chain",
        nodes: ["drafts", "score", "final"],
      },
    ]);

    await expect(
      registry.invoke("launch-review", { product: "Nest AI Kit" }),
    ).resolves.toMatchObject({
      output: {
        decision: "ship",
        owner: "judge",
      },
      steps: {
        drafts: {
          planner: {
            content: expect.stringContaining("planner:Draft a launch plan"),
          },
          critic: {
            content: expect.stringContaining("critic:Draft a launch plan"),
          },
        },
        score: {
          toolCalls: [
            {
              name: "score_plan",
              args: {
                score: 9,
                reason: "critic approved",
              },
            },
          ],
        },
        final: {
          decision: "ship",
          owner: "judge",
        },
      },
    });

    await moduleRef.close();
  });

  it("falls back to the next provider role when the first model fails", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CollaborativePatternsModule.forRoot()],
      providers: [
        FallbackTask,
        {
          provide: PRIMARY_MODEL,
          useValue: new FailingModel("primary is down"),
        },
        {
          provide: BACKUP_MODEL,
          useValue: new FakeChatModel("backup"),
        },
      ],
    }).compile();

    await moduleRef.init();

    const service = moduleRef.get(PatternsService);

    await expect(
      service.invoke("fallback-answer", { question: "What should we do?" }),
    ).resolves.toMatchObject({
      output: {
        role: "backup",
        content: "backup:Answer: What should we do?",
      },
      steps: {
        answer: {
          role: "backup",
          content: "backup:Answer: What should we do?",
          attempts: [
            {
              role: "primary",
              error: "primary is down",
            },
          ],
        },
      },
    });

    await moduleRef.close();
  });
});

class FakeChatModel {
  constructor(private readonly role: string) {}

  async invoke(input: unknown) {
    return {
      content: `${this.role}:${stringifyInput(input)}`,
    };
  }

  bindTools(tools: Array<{ name: string }>) {
    return {
      invoke: async () => ({
        content: "",
        tool_calls: [
          {
            id: "call-1",
            name: tools[0]?.name,
            args: {
              score: 9,
              reason: `${this.role} approved`,
            },
            type: "tool_call",
          },
        ],
      }),
    };
  }

  withStructuredOutput() {
    return {
      invoke: async () => ({
        decision: "ship",
        owner: this.role,
      }),
    };
  }
}

class FailingModel {
  constructor(private readonly message: string) {}

  async invoke() {
    throw new Error(this.message);
  }
}

function stringifyInput(input: unknown): string {
  return typeof input === "string" ? input : JSON.stringify(input);
}
