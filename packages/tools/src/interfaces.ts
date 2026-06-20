import type { ToolWrapperParams } from '@langchain/core/tools';

export interface LangToolOptions extends ToolWrapperParams {
  name: string;
}

export interface ToolsModuleOptions {
  global?: boolean;
  autoDiscoverTools?: boolean;
}

