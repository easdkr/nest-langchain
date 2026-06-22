import { SetMetadata } from '@nestjs/common';

import { LANG_TOOL_METADATA } from '../constants';
import type { LangToolOptions } from '../interfaces';

export function LangTool(options: LangToolOptions): MethodDecorator {
  return SetMetadata(LANG_TOOL_METADATA, options);
}
