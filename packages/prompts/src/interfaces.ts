import type { PromptTemplate } from '@langchain/core/prompts';

export type PromptInputValues = Record<string, unknown>;

export interface PromptDefinition {
  name: string;
  template: string;
  inputVariables?: string[];
  metadata?: Record<string, unknown>;
}

export interface RegisteredPrompt extends PromptDefinition {
  prompt: PromptTemplate;
}

export interface PromptsModuleOptions {
  global?: boolean;
  prompts?: PromptDefinition[];
}
