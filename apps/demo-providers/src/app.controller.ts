import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  PROVIDER_CATALOG,
  type ProviderCatalogItem,
  type ProviderName,
} from './provider-catalog';

interface InvokeBody {
  prompt?: string;
}

interface ChatModelLike {
  invoke(input: string): Promise<unknown>;
}

@Controller()
export class AppController {
  constructor(private readonly moduleRef: ModuleRef) {}

  @Get('providers')
  listProviders() {
    return PROVIDER_CATALOG.map((provider) => ({
      name: provider.name,
      packageName: provider.packageName,
      description: provider.description,
      configured: Boolean(this.getModel(provider)),
      requiredEnv: provider.requiredEnv,
    }));
  }

  @Post('providers/:name/invoke')
  async invokeProvider(
    @Param('name') name: ProviderName,
    @Body() body: InvokeBody = {},
  ) {
    const provider = findProvider(name);
    const model = this.getModel(provider);

    if (!model) {
      throw new BadRequestException({
        provider: provider.name,
        packageName: provider.packageName,
        message: 'Provider module is not configured in this process.',
        requiredEnv: provider.requiredEnv,
      });
    }

    const result = await model.invoke(
      body.prompt?.trim() || 'Write one sentence about NestJS provider tokens.',
    );

    return {
      provider: provider.name,
      result: serializeResult(result),
    };
  }

  private getModel(provider: ProviderCatalogItem): ChatModelLike | undefined {
    try {
      return this.moduleRef.get<ChatModelLike>(provider.token, {
        strict: false,
      });
    } catch {
      return undefined;
    }
  }
}

function findProvider(name: ProviderName): ProviderCatalogItem {
  const provider = PROVIDER_CATALOG.find(
    (candidate) => candidate.name === name,
  );

  if (!provider) {
    throw new BadRequestException({
      message: `Unknown provider "${name}".`,
      providers: PROVIDER_CATALOG.map((candidate) => candidate.name),
    });
  }

  return provider;
}

function serializeResult(result: unknown) {
  if (
    result &&
    typeof result === 'object' &&
    'content' in result &&
    typeof result.content === 'string'
  ) {
    return {
      content: result.content,
    };
  }

  return result;
}
