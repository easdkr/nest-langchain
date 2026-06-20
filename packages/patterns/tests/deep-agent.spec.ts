import "reflect-metadata";

import { Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { tool } from "@langchain/core/tools";
import { LangChainRegistry } from "@nest-langchain/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDeepAgent } from "deepagents";

import {
  CollaborativePatternsModule,
  DeepAgent,
  DeepAgentSubagent,
  DeepAgentTool,
  PatternsService,
} from "../src";

vi.mock("deepagents", () => ({
  createDeepAgent: vi.fn((config: Record<string, unknown>) => ({
    invoke: async (input: unknown) => ({
      input,
      deepAgentConfig: config,
    }),
  })),
}));

vi.mock("@langchain/core/tools", () => ({
  tool: vi.fn((handler: unknown, options: Record<string, unknown>) => ({
    ...options,
    invoke: handler,
  })),
}));

const SUPERVISOR_MODEL = Symbol("supervisor-model");
const RESEARCHER_MODEL = Symbol("researcher-model");
const CONTEXT_SCHEMA = { runtime: "context" };
const RESPONSE_FORMAT = {
  type: "object",
  properties: { summary: { type: "string" } },
};
const STREAM_TRANSFORMERS = [() => "stream"];
const MEMORY = ["/memories/market-research"];
const CHECKPOINTER = { type: "checkpointer" };
const STORE = { type: "store" };
const BACKEND = { type: "backend" };
const MIDDLEWARE = [{ name: "guardrail" }];

@DeepAgent({
  name: "market-research-agent",
  description: "Deep research agent with filesystem and subagent delegation.",
  model: "supervisor",
  models: [
    { role: "supervisor", token: SUPERVISOR_MODEL },
    { role: "researcher", token: RESEARCHER_MODEL },
  ],
  systemPrompt: "Plan, research, and write concise reports.",
  skills: ["/skills/research"],
  contextSchema: CONTEXT_SCHEMA,
  responseFormat: RESPONSE_FORMAT,
  streamTransformers: STREAM_TRANSFORMERS,
  memory: MEMORY,
  checkpointer: CHECKPOINTER,
  store: STORE,
  backend: BACKEND,
  middleware: MIDDLEWARE,
  interruptOn: {
    write_file: true,
  },
  permissions: {
    filesystem: {
      read: ["reports/**"],
      write: ["reports/**"],
    },
  },
  tags: ["deep-agent", "research"],
  createOptions: {
    customOption: "kept",
  },
})
@Injectable()
class MarketResearchAgent {
  @DeepAgentTool({
    name: "search_market",
    description: "Search market notes.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  })
  searchMarket(input: { query: string }) {
    return `notes for ${input.query}`;
  }

  @DeepAgentSubagent({
    name: "researcher",
    description: "Runs isolated market research.",
    model: "researcher",
    systemPrompt: "You are a focused market researcher.",
    tools: ["search_market"],
    skills: ["/skills/researcher"],
    interruptOn: {
      search_market: false,
    },
  })
  researcher() {
    return undefined;
  }
}

describe("Deep Agent decorators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps createDeepAgent with decorated tools, subagents, skills, permissions, and approval settings", async () => {
    const supervisor = new FakeDeepAgentModel("supervisor");
    const researcher = new FakeDeepAgentModel("researcher");
    const moduleRef = await Test.createTestingModule({
      imports: [CollaborativePatternsModule.forRoot()],
      providers: [
        MarketResearchAgent,
        {
          provide: SUPERVISOR_MODEL,
          useValue: supervisor,
        },
        {
          provide: RESEARCHER_MODEL,
          useValue: researcher,
        },
      ],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(LangChainRegistry);
    const service = moduleRef.get(PatternsService);

    expect(tool).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        name: "search_market",
        description: "Search market notes.",
      }),
    );
    expect(createDeepAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: supervisor,
        name: "market-research-agent",
        systemPrompt: "Plan, research, and write concise reports.",
        skills: ["/skills/research"],
        contextSchema: CONTEXT_SCHEMA,
        responseFormat: RESPONSE_FORMAT,
        streamTransformers: STREAM_TRANSFORMERS,
        memory: MEMORY,
        checkpointer: CHECKPOINTER,
        store: STORE,
        backend: BACKEND,
        middleware: MIDDLEWARE,
        customOption: "kept",
        interruptOn: {
          write_file: true,
        },
        permissions: {
          filesystem: {
            read: ["reports/**"],
            write: ["reports/**"],
          },
        },
        subagents: [
          expect.objectContaining({
            name: "researcher",
            description: "Runs isolated market research.",
            model: researcher,
            systemPrompt: "You are a focused market researcher.",
            skills: ["/skills/researcher"],
            interruptOn: {
              search_market: false,
            },
          }),
        ],
      }),
    );
    expect(registry.listGraphs()).toMatchObject([
      {
        name: "market-research-agent",
        kind: "graph",
        nodes: ["search_market", "researcher"],
      },
    ]);

    await expect(
      service.invoke("market-research-agent", {
        messages: [{ role: "user", content: "Research NestJS AI tools." }],
      }),
    ).resolves.toMatchObject({
      input: {
        messages: [{ role: "user", content: "Research NestJS AI tools." }],
      },
      deepAgentConfig: {
        model: supervisor,
      },
    });

    await moduleRef.close();
  });
});

class FakeDeepAgentModel {
  constructor(readonly role: string) {}
}
