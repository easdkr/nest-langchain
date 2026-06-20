import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  MemoryLayoutStorage,
  VisualizationModule,
} from "@nest-langchain/visualization";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";

describe("demo-visualization e2e", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("hosts graph docs and layout APIs under /ai/graphs", async () => {
    app = await NestFactory.create(AppModule, { logger: false });

    VisualizationModule.setup(
      "/ai/graphs",
      app,
      { title: "Nest LangChain Demo Graphs" },
      {
        editable: true,
        layout: {
          storage: new MemoryLayoutStorage(),
        },
      },
    );

    await app.listen(0);
    const baseUrl = await app.getUrl();

    const htmlResponse = await fetch(`${baseUrl}/ai/graphs`);
    expect(htmlResponse.ok).toBe(true);
    await expect(htmlResponse.text()).resolves.toContain("/ai/graphs/json");

    const jsonResponse = await fetch(`${baseUrl}/ai/graphs/json`);
    expect(jsonResponse.ok).toBe(true);
    const doc = (await jsonResponse.json()) as {
      graphs: Array<{
        id: string;
        nodes: Array<{ id: string }>;
      }>;
    };
    expect(doc.graphs[0]).toMatchObject({ id: "joke" });
    expect(doc.graphs[0]?.nodes[0]?.id).toBe("joke:writeAnswer");

    const mermaidResponse = await fetch(`${baseUrl}/ai/graphs/mermaid`);
    expect(mermaidResponse.ok).toBe(true);
    await expect(mermaidResponse.text()).resolves.toContain("joke_writeAnswer");

    const layoutResponse = await fetch(`${baseUrl}/ai/graphs/layouts/joke`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: "1",
        nodes: {
          "joke:writeAnswer": {
            x: 11,
            y: 22,
            pinned: true,
          },
        },
      }),
    });
    expect(layoutResponse.ok).toBe(true);

    const savedLayoutResponse = await fetch(
      `${baseUrl}/ai/graphs/layouts/joke`,
    );
    expect(savedLayoutResponse.ok).toBe(true);
    await expect(savedLayoutResponse.json()).resolves.toMatchObject({
      graphId: "joke",
      nodes: {
        "joke:writeAnswer": {
          x: 11,
          y: 22,
          pinned: true,
        },
      },
    });
  });
});
