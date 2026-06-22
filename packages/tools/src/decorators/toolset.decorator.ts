import { Injectable } from '@nestjs/common';

import type { ToolsetOptions } from '../interfaces';

const TOOLSET_METADATA = Symbol.for('@nest-langchain/tools/toolset');

export function Toolset(options: ToolsetOptions = {}): ClassDecorator {
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(TOOLSET_METADATA, options, target);
  };
}

export function getToolsetOptions(target: object): ToolsetOptions {
  return (
    (Reflect.getMetadata(TOOLSET_METADATA, target) as
      | ToolsetOptions
      | undefined) ?? {}
  );
}
