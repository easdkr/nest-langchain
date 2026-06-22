import type { LangSmithOptions } from './interfaces';

let runtimeOptions: LangSmithOptions = {};

export function configureLangSmithRuntime(
  options: LangSmithOptions = {},
): void {
  runtimeOptions = {
    ...options,
  };
}

export function getLangSmithRuntimeOptions(): LangSmithOptions {
  return runtimeOptions;
}

export function resetLangSmithRuntime(): void {
  runtimeOptions = {};
}
