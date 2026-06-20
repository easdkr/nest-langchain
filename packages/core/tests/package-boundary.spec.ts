import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('@nest-langchain/core package boundary', () => {
  it('does not depend on optional LangChain integration packages', async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const runtimeDependencies = {
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
    };

    expect(runtimeDependencies).not.toHaveProperty('@langchain/anthropic');
    expect(runtimeDependencies).not.toHaveProperty('@langchain/aws');
    expect(runtimeDependencies).not.toHaveProperty('@langchain/core');
    expect(runtimeDependencies).not.toHaveProperty('@langchain/google-genai');
    expect(runtimeDependencies).not.toHaveProperty('@langchain/langgraph');
    expect(runtimeDependencies).not.toHaveProperty('@langchain/openai');
    expect(runtimeDependencies).not.toHaveProperty('langsmith');
  });
});
