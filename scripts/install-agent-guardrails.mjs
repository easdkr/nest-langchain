#!/usr/bin/env node
import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillSource = join(repoRoot, 'agent-skills', 'nest-langchain-release');
const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
const skillTarget = join(codexHome, 'skills', 'nest-langchain-release');
const hookPath = join(repoRoot, '.githooks', 'pre-push');

if (!existsSync(skillSource)) {
  throw new Error(`Missing skill source: ${skillSource}`);
}

if (!existsSync(hookPath)) {
  throw new Error(`Missing pre-push hook: ${hookPath}`);
}

mkdirSync(dirname(skillTarget), { recursive: true });
rmSync(skillTarget, { recursive: true, force: true });
cpSync(skillSource, skillTarget, { recursive: true });

chmodSync(hookPath, 0o755);
execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

console.log(`Installed nest-langchain release skill to ${skillTarget}`);
console.log(`Made pre-push hook executable at ${hookPath}`);
console.log('Configured git core.hooksPath=.githooks');
