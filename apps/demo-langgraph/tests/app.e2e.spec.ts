import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";

describe("demo-langgraph e2e", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("lists and invokes the decorated LangGraph through HTTP", async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const baseUrl = await app.getUrl();

    const graphsResponse = await fetch(`${baseUrl}/graphs`);
    expect(graphsResponse.ok).toBe(true);
    const graphs = (await graphsResponse.json()) as Array<{
      name: string;
      kind: string;
      nodes: string[];
    }>;

    expect(graphs[0]).toMatchObject({
      name: "joke",
      kind: "graph",
      nodes: ["draftJoke", "localizeJoke"],
    });

    const invokeResponse = await fetch(
      `${baseUrl}/graphs/joke?topic=nestjs&language=en`,
    );
    expect(invokeResponse.ok).toBe(true);
    const body = (await invokeResponse.json()) as {
      topic: string;
      language: string;
      answer: string;
    };

    expect(body.topic).toBe("nestjs");
    expect(body.language).toBe("en");
    expect(body.answer).toContain("nestjs");
  });
});
