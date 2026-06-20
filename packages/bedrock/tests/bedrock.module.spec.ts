import { ChatBedrockConverse } from "@langchain/aws";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BedrockProviderModule,
  NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
} from "../src";

vi.mock("@langchain/aws", () => ({
  ChatBedrockConverse: vi.fn(function ChatBedrockConverseMock(
    config: Record<string, unknown>,
  ) {
    return {
      config,
      provider: "bedrock",
    };
  }),
}));

describe("BedrockProviderModule", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_PROFILE", "");
    vi.stubEnv("AWS_REGION", "");
    vi.stubEnv("AWS_DEFAULT_REGION", "");
    vi.stubEnv("AWS_CONFIG_FILE", join(tmpdir(), "missing-aws-config"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("provides a ChatBedrockConverse factory behind a Nest DI token", () => {
    const module = BedrockProviderModule.forRoot({
      model: "anthropic.claude-test-v1:0",
      region: "us-east-1",
      temperature: 0.4,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === "object" &&
        "provide" in candidate &&
        candidate.provide === NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: "bedrock",
      config: {
        model: "anthropic.claude-test-v1:0",
        region: "us-east-1",
        temperature: 0.4,
      },
    });
    expect(ChatBedrockConverse).toHaveBeenCalledOnce();
  });

  it("loads the region from the active AWS profile when region env is absent", () => {
    const directory = mkdtempSync(join(tmpdir(), "nest-langchain-aws-"));
    const configFile = join(directory, "config");

    writeFileSync(
      configFile,
      "[profile smoke]\nregion = ap-northeast-2\n",
      "utf8",
    );
    vi.stubEnv("AWS_PROFILE", "smoke");
    vi.stubEnv("AWS_REGION", "");
    vi.stubEnv("AWS_DEFAULT_REGION", "");
    vi.stubEnv("AWS_CONFIG_FILE", configFile);

    try {
      const module = BedrockProviderModule.forRoot({
        model: "anthropic.claude-test-v1:0",
      });
      const provider = module.providers?.find(
        (candidate) =>
          typeof candidate === "object" &&
          "provide" in candidate &&
          candidate.provide === NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
      ) as { useFactory: () => unknown };

      expect(provider.useFactory()).toEqual({
        provider: "bedrock",
        config: {
          model: "anthropic.claude-test-v1:0",
          region: "ap-northeast-2",
          temperature: 0,
        },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("validates that an AWS region is configured", () => {
    const module = BedrockProviderModule.forRoot({
      region: "",
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === "object" &&
        "provide" in candidate &&
        candidate.provide === NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow("AWS region is required.");
  });
});
