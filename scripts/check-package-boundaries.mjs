import { readFile } from "node:fs/promises";
import { join } from "node:path";

const packages = {
  core: JSON.parse(
    await readFile(join("packages", "core", "package.json"), "utf8"),
  ),
  langgraph: JSON.parse(
    await readFile(join("packages", "langgraph", "package.json"), "utf8"),
  ),
  langsmith: JSON.parse(
    await readFile(join("packages", "langsmith", "package.json"), "utf8"),
  ),
  visualization: JSON.parse(
    await readFile(join("packages", "visualization", "package.json"), "utf8"),
  ),
  patterns: JSON.parse(
    await readFile(join("packages", "patterns", "package.json"), "utf8"),
  ),
  openai: JSON.parse(
    await readFile(join("packages", "openai", "package.json"), "utf8"),
  ),
  openaiCompatible: JSON.parse(
    await readFile(
      join("packages", "openai-compatible", "package.json"),
      "utf8",
    ),
  ),
  anthropic: JSON.parse(
    await readFile(join("packages", "anthropic", "package.json"), "utf8"),
  ),
  gemini: JSON.parse(
    await readFile(join("packages", "gemini", "package.json"), "utf8"),
  ),
  bedrock: JSON.parse(
    await readFile(join("packages", "bedrock", "package.json"), "utf8"),
  ),
  tools: JSON.parse(
    await readFile(join("packages", "tools", "package.json"), "utf8"),
  ),
  prompts: JSON.parse(
    await readFile(join("packages", "prompts", "package.json"), "utf8"),
  ),
};

const runtimeDeps = (packageJson) => ({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});

const forbiddenCoreDeps = [
  "@langchain/core",
  "@langchain/anthropic",
  "@langchain/aws",
  "@langchain/google-genai",
  "@langchain/langgraph",
  "@langchain/openai",
  "langsmith",
  "@nest-langchain/langgraph",
  "@nest-langchain/langsmith",
  "@nest-langchain/visualization",
  "@nest-langchain/patterns",
  "@nest-langchain/openai",
  "@nest-langchain/openai-compatible",
  "@nest-langchain/anthropic",
  "@nest-langchain/gemini",
  "@nest-langchain/bedrock",
  "@nest-langchain/tools",
  "@nest-langchain/prompts",
];

for (const dependency of forbiddenCoreDeps) {
  assert(
    !Object.hasOwn(runtimeDeps(packages.core), dependency),
    `@nest-langchain/core must not depend on ${dependency}`,
  );
}

assert(
  Object.hasOwn(runtimeDeps(packages.langgraph), "@langchain/langgraph"),
  "@nest-langchain/langgraph must own @langchain/langgraph",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.langsmith), "@langchain/langgraph"),
  "@nest-langchain/langsmith must not depend on @langchain/langgraph",
);
assert(
  Object.hasOwn(runtimeDeps(packages.langsmith), "langsmith"),
  "@nest-langchain/langsmith must own langsmith",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.langgraph), "langsmith"),
  "@nest-langchain/langgraph must not depend on langsmith",
);
assert(
  Object.hasOwn(runtimeDeps(packages.openai), "@langchain/openai"),
  "@nest-langchain/openai must own @langchain/openai",
);
assertProviderBoundary(
  packages.openai,
  "@nest-langchain/openai",
  "@langchain/openai",
);
assert(
  Object.hasOwn(runtimeDeps(packages.openaiCompatible), "@langchain/openai"),
  "@nest-langchain/openai-compatible must own @langchain/openai",
);
assertProviderBoundary(
  packages.openaiCompatible,
  "@nest-langchain/openai-compatible",
  "@langchain/openai",
);
assertProviderBoundary(
  packages.anthropic,
  "@nest-langchain/anthropic",
  "@langchain/anthropic",
);
assertProviderBoundary(
  packages.gemini,
  "@nest-langchain/gemini",
  "@langchain/google-genai",
);
assertProviderBoundary(
  packages.bedrock,
  "@nest-langchain/bedrock",
  "@langchain/aws",
);
assert(
  Object.hasOwn(runtimeDeps(packages.tools), "@langchain/core"),
  "@nest-langchain/tools must own @langchain/core",
);
assert(
  Object.hasOwn(runtimeDeps(packages.tools), "zod"),
  "@nest-langchain/tools must own zod",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.tools), "@langchain/langgraph"),
  "@nest-langchain/tools must not depend on @langchain/langgraph",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.tools), "langsmith"),
  "@nest-langchain/tools must not depend on langsmith",
);
assert(
  Object.hasOwn(runtimeDeps(packages.prompts), "@langchain/core"),
  "@nest-langchain/prompts must own @langchain/core",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.prompts), "@langchain/langgraph"),
  "@nest-langchain/prompts must not depend on @langchain/langgraph",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.prompts), "langsmith"),
  "@nest-langchain/prompts must not depend on langsmith",
);
assert(
  Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/core"),
  "@nest-langchain/patterns must own @langchain/core",
);
assert(
  Object.hasOwn(runtimeDeps(packages.patterns), "deepagents"),
  "@nest-langchain/patterns must expose deepagents as an optional peer dependency",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/langgraph"),
  "@nest-langchain/patterns must not depend directly on @langchain/langgraph",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "langsmith"),
  "@nest-langchain/patterns must not depend on langsmith",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/openai"),
  "@nest-langchain/patterns must not depend on provider SDKs",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/anthropic"),
  "@nest-langchain/patterns must not depend on provider SDKs",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/google-genai"),
  "@nest-langchain/patterns must not depend on provider SDKs",
);
assert(
  !Object.hasOwn(runtimeDeps(packages.patterns), "@langchain/aws"),
  "@nest-langchain/patterns must not depend on provider SDKs",
);

console.log("Package boundaries OK");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertProviderBoundary(packageJson, packageName, providerDependency) {
  const dependencies = runtimeDeps(packageJson);

  assert(
    Object.hasOwn(dependencies, providerDependency),
    `${packageName} must own ${providerDependency}`,
  );
  assert(
    !Object.hasOwn(dependencies, "@nest-langchain/core"),
    `${packageName} must not require @nest-langchain/core`,
  );
  assert(
    !Object.hasOwn(dependencies, "@langchain/langgraph"),
    `${packageName} must not depend on @langchain/langgraph`,
  );
  assert(
    !Object.hasOwn(dependencies, "langsmith"),
    `${packageName} must not depend on langsmith`,
  );
}
