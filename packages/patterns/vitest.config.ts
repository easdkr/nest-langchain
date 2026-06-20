import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@nest-langchain/core": new URL("../core/src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts", "src/**/*.spec.ts"],
  },
});
