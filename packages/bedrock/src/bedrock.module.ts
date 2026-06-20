import { DynamicModule, Module } from "@nestjs/common";
import { ChatBedrockConverse } from "@langchain/aws";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { NEST_LANGCHAIN_BEDROCK_CHAT_MODEL } from "./tokens";

export interface BedrockProviderOptions {
  credentials?: unknown;
  model?: string;
  region?: string;
  temperature?: number;
}

@Module({})
export class BedrockProviderModule {
  static forRoot(options: BedrockProviderOptions = {}): DynamicModule {
    return {
      module: BedrockProviderModule,
      providers: [
        {
          provide: NEST_LANGCHAIN_BEDROCK_CHAT_MODEL,
          useFactory: () => {
            const region = firstNonEmpty(
              options.region,
              process.env.AWS_REGION,
              process.env.AWS_DEFAULT_REGION,
              readAwsProfileRegion(process.env.AWS_PROFILE),
            );

            if (!region) {
              throw new Error("AWS region is required.");
            }

            const config: Record<string, unknown> = {
              model:
                options.model ?? "anthropic.claude-3-5-sonnet-20240620-v1:0",
              region,
              temperature: options.temperature ?? 0,
            };

            if (options.credentials) {
              config.credentials = options.credentials;
            }

            return new (ChatBedrockConverse as ChatBedrockConverseConstructor)(
              config,
            );
          },
        },
      ],
      exports: [NEST_LANGCHAIN_BEDROCK_CHAT_MODEL],
    };
  }
}

type ChatBedrockConverseConstructor = new (
  fields: Record<string, unknown>,
) => InstanceType<typeof ChatBedrockConverse>;

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function readAwsProfileRegion(profileName = "default"): string | undefined {
  const configFile =
    process.env.AWS_CONFIG_FILE ?? join(homedir(), ".aws", "config");

  try {
    return parseAwsRegion(readFileSync(configFile, "utf8"), profileName);
  } catch {
    return undefined;
  }
}

function parseAwsRegion(
  content: string,
  profileName: string,
): string | undefined {
  const targetSections =
    profileName === "default"
      ? new Set(["default"])
      : new Set([`profile ${profileName}`, profileName]);
  let inTargetSection = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
      continue;
    }

    const section = /^\[(.+)]$/.exec(trimmed);

    if (section) {
      inTargetSection = targetSections.has(section[1].trim());
      continue;
    }

    if (!inTargetSection) {
      continue;
    }

    const region = /^region\s*=\s*(.+)$/.exec(trimmed);

    if (region) {
      return region[1].trim();
    }
  }

  return undefined;
}
