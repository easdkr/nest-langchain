import { ChatAnthropic } from "@langchain/anthropic";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AnthropicProviderModule,
  NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
} from "../src";

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn(function ChatAnthropicMock(
    config: Record<string, unknown>,
  ) {
    return {
      config,
      provider: "anthropic",
    };
  }),
}));

describe("AnthropicProviderModule", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("CLAUDE_API_KEY", "");
    vi.stubEnv("ANTHROPIC_BASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("provides a ChatAnthropic factory behind a Nest DI token", () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: "anthropic-key",
      model: "claude-test",
      temperature: 0.2,
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === "object" &&
        "provide" in candidate &&
        candidate.provide === NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: "anthropic",
      config: {
        apiKey: "anthropic-key",
        model: "claude-test",
        temperature: 0.2,
      },
    });
    expect(ChatAnthropic).toHaveBeenCalledOnce();
  });

  it("uses Claude-compatible environment fallbacks", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("CLAUDE_API_KEY", "claude-key");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://anthropic.example.test");

    const module = AnthropicProviderModule.forRoot();
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === "object" &&
        "provide" in candidate &&
        candidate.provide === NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(provider.useFactory()).toEqual({
      provider: "anthropic",
      config: {
        apiKey: "claude-key",
        anthropicApiUrl: "https://anthropic.example.test",
        model: "claude-haiku-4-5-20251001",
        temperature: 0,
      },
    });
  });

  it("validates that an API key is configured", () => {
    const module = AnthropicProviderModule.forRoot({
      apiKey: "",
    });
    const provider = module.providers?.find(
      (candidate) =>
        typeof candidate === "object" &&
        "provide" in candidate &&
        candidate.provide === NEST_LANGCHAIN_ANTHROPIC_CHAT_MODEL,
    ) as { useFactory: () => unknown };

    expect(() => provider.useFactory()).toThrow(
      "Anthropic API key is required.",
    );
  });
});
