import { PromptTemplate } from '@langchain/core/prompts';
import { Injectable } from '@nestjs/common';

import type {
  PromptDefinition,
  PromptInputValues,
  RegisteredPrompt,
} from './interfaces';

@Injectable()
export class PromptRegistry {
  private readonly prompts = new Map<string, RegisteredPrompt>();

  registerPrompt(definition: PromptDefinition): void {
    if (this.prompts.has(definition.name)) {
      throw new Error(`Prompt "${definition.name}" is already registered.`);
    }

    const prompt = definition.inputVariables
      ? new PromptTemplate({
          inputVariables: definition.inputVariables,
          template: definition.template,
        })
      : PromptTemplate.fromTemplate(definition.template);

    this.prompts.set(definition.name, {
      ...definition,
      prompt,
    });
  }

  getPrompt(name: string): RegisteredPrompt {
    const prompt = this.prompts.get(name);

    if (!prompt) {
      throw new Error(`Unknown prompt "${name}".`);
    }

    return prompt;
  }

  listPrompts(): Omit<RegisteredPrompt, 'prompt'>[] {
    return Array.from(this.prompts.values()).map(
      ({ prompt: _prompt, ...registered }) => registered,
    );
  }

  async format(name: string, values: PromptInputValues): Promise<string> {
    return this.getPrompt(name).prompt.format(values);
  }
}
