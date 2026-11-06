import { DynamicModule, Global, Module } from '@nestjs/common';
import { THROTTLER_OPTIONS, THROTTLER_STORAGE } from './throttler.constants.js';
import type { ThrottlerOptions } from './throttler.interfaces.js';
import { ThrottlerStorage } from './throttler.storage.js';

@Global()
@Module({})
export class ThrottlerModule {
  static forRoot(throttlers: ThrottlerOptions[]): DynamicModule {
    const providers = [
      { provide: THROTTLER_OPTIONS, useValue: throttlers },
      { provide: THROTTLER_STORAGE, useClass: ThrottlerStorage },
    ];
    return { module: ThrottlerModule, providers, exports: providers };
  }
}
