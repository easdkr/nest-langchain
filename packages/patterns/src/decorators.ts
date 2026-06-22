import 'reflect-metadata';

import { Injectable } from '@nestjs/common';

import {
  COLLABORATIVE_TASK_METADATA,
  DEEP_AGENT_METADATA,
  DEEP_AGENT_SUBAGENT_METADATA,
  DEEP_AGENT_TOOL_METADATA,
  TASK_STEP_METADATA,
} from './constants';
import type {
  CollaborativeTaskOptions,
  DeepAgentOptions,
  DeepAgentSubagentOptions,
  DeepAgentToolOptions,
  TaskStepOptions,
} from './interfaces';

export function CollaborativeTask(
  options: CollaborativeTaskOptions,
): ClassDecorator {
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(COLLABORATIVE_TASK_METADATA, options, target);
  };
}

export function TaskStep(options: TaskStepOptions = {}): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata(
      TASK_STEP_METADATA,
      options,
      descriptor.value as object,
    );
  };
}

export function DeepAgent(options: DeepAgentOptions): ClassDecorator {
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(DEEP_AGENT_METADATA, options, target);
  };
}

export function DeepAgentTool(options: DeepAgentToolOptions): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata(
      DEEP_AGENT_TOOL_METADATA,
      options,
      descriptor.value as object,
    );
  };
}

export function DeepAgentSubagent(
  options: DeepAgentSubagentOptions,
): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    Reflect.defineMetadata(
      DEEP_AGENT_SUBAGENT_METADATA,
      options,
      descriptor.value as object,
    );
  };
}
