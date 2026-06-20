import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packages = {
  core: JSON.parse(await readFile(join('packages', 'core', 'package.json'), 'utf8')),
  langgraph: JSON.parse(
    await readFile(join('packages', 'langgraph', 'package.json'), 'utf8'),
  ),
  langsmith: JSON.parse(
    await readFile(join('packages', 'langsmith', 'package.json'), 'utf8'),
  ),
  visualization: JSON.parse(
    await readFile(join('packages', 'visualization', 'package.json'), 'utf8'),
  ),
  openai: JSON.parse(await readFile(join('packages', 'openai', 'package.json'), 'utf8')),
  tools: JSON.parse(await readFile(join('packages', 'tools', 'package.json'), 'utf8')),
  prompts: JSON.parse(
    await readFile(join('packages', 'prompts', 'package.json'), 'utf8'),
  ),
};

const runtimeDeps = (packageJson) => ({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});

const forbiddenCoreDeps = [
  '@langchain/core',
  '@langchain/langgraph',
  '@langchain/openai',
  'langsmith',
  '@nest-langchain/langgraph',
  '@nest-langchain/langsmith',
  '@nest-langchain/visualization',
  '@nest-langchain/openai',
  '@nest-langchain/tools',
  '@nest-langchain/prompts',
];

for (const dependency of forbiddenCoreDeps) {
  assert(
    !Object.hasOwn(runtimeDeps(packages.core), dependency),
    `@nest-langchain/core must not depend on ${dependency}`,
  );
}

assert(
  Object.hasOwn(runtimeDeps(packages.langgraph), '@langchain/langgraph'),
  '@nest-langchain/langgraph must own @langchain/langgraph',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.langsmith), '@langchain/langgraph'),
  '@nest-langchain/langsmith must not depend on @langchain/langgraph',
);
assert(
  Object.hasOwn(runtimeDeps(packages.langsmith), 'langsmith'),
  '@nest-langchain/langsmith must own langsmith',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.langgraph), 'langsmith'),
  '@nest-langchain/langgraph must not depend on langsmith',
);
assert(
  Object.hasOwn(runtimeDeps(packages.openai), '@langchain/openai'),
  '@nest-langchain/openai must own @langchain/openai',
);
assert(
  Object.hasOwn(runtimeDeps(packages.tools), '@langchain/core'),
  '@nest-langchain/tools must own @langchain/core',
);
assert(
  Object.hasOwn(runtimeDeps(packages.tools), 'zod'),
  '@nest-langchain/tools must own zod',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.tools), '@langchain/langgraph'),
  '@nest-langchain/tools must not depend on @langchain/langgraph',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.tools), 'langsmith'),
  '@nest-langchain/tools must not depend on langsmith',
);
assert(
  Object.hasOwn(runtimeDeps(packages.prompts), '@langchain/core'),
  '@nest-langchain/prompts must own @langchain/core',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.prompts), '@langchain/langgraph'),
  '@nest-langchain/prompts must not depend on @langchain/langgraph',
);
assert(
  !Object.hasOwn(runtimeDeps(packages.prompts), 'langsmith'),
  '@nest-langchain/prompts must not depend on langsmith',
);

console.log('Package boundaries OK');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
