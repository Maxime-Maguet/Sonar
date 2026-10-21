import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveWebOrigins, type WebOrigins } from './web-origins.js';

// Origines web autorisées, calculées une seule fois (CSRF, CORS).
export const WEB_ORIGINS = Symbol('WEB_ORIGINS');

export const webOriginsProvider: Provider = {
  provide: WEB_ORIGINS,
  useFactory: (config: ConfigService): WebOrigins =>
    resolveWebOrigins(
      config.getOrThrow<string>('WEB_ORIGIN'),
      config.get<string>('NODE_ENV'),
    ),
  inject: [ConfigService],
};

@Module({
  providers: [webOriginsProvider],
  exports: [WEB_ORIGINS],
})
export class WebOriginsModule {}
