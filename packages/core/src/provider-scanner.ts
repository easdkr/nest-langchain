import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';

export interface DecoratedProvider<TMetadata> {
  instance: Record<string, unknown>;
  metatype: Function;
  metadata: TMetadata;
}

@Injectable()
export class DecoratedProviderScanner {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  scan<TMetadata>(metadataKey: string | symbol): Array<DecoratedProvider<TMetadata>> {
    return this.discoveryService
      .getProviders()
      .flatMap((wrapper): Array<DecoratedProvider<TMetadata>> => {
        const instance = wrapper.instance as Record<string, unknown> | undefined;
        const metatype = wrapper.metatype;

        if (!instance || !metatype) {
          return [];
        }

        const metadata = this.reflector.get<TMetadata>(metadataKey, metatype);

        if (!metadata) {
          return [];
        }

        return [
          {
            instance,
            metatype,
            metadata,
          },
        ];
      });
  }
}

