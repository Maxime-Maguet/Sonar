import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmetModule from 'helmet';
import type { HelmetOptions } from 'helmet';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
import cookieParser from 'cookie-parser';
import { applyCors } from './config/cors.options.js';
import { parseTrustProxyHops, resolveTrustProxy } from './config/trust-proxy.js';
import type { WebOrigins } from './config/web-origins.js';
import { WEB_ORIGINS } from './config/web-origins.module.js';
import { ConfigService } from '@nestjs/config';

// Le contrôle de types de Vercel lit les types CommonJS de helmet depuis ce
// fichier ESM : l'import par défaut y devient un objet non appelable (TS2349).
// On fixe le type attendu nous-mêmes ; à l'exécution, c'est bien la fonction.
type HelmetMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;
type HelmetFactory = (options?: Readonly<HelmetOptions>) => HelmetMiddleware;
const helmet = helmetModule as unknown as HelmetFactory;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  // Nombre de proxies devant l'API : à poser avant que les limites par IP
  // ne lisent l'adresse du visiteur. Absent = aucun proxy.
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      resolveTrustProxy(
        parseTrustProxyHops(config.get<string>('TRUST_PROXY_HOPS')),
      ),
    );
  // Filtre les erreurs Prisma pour renvoyer des messages utilisateurs clairs
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  // Validation des données entrantes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforme les données entrantes en objets JavaScript
      whitelist: true, // Supprime les propriétés non définies dans le DTO
      forbidNonWhitelisted: true, // Lance une erreur si des propriétés non définies sont envoyées
    }),
  );

  // Protection contre les attaques XSS et autres vulnérabilités
  // Helmet aide à sécuriser l'application en définissant des en-têtes HTTP
  app.use(helmet());
  app.use(cookieParser());
  // Configuration des CORS
  // Permet de contrôler les requêtes entrantes depuis différentes origines
  applyCors(app, app.get<WebOrigins>(WEB_ORIGINS), config.get<string>('NODE_ENV'));
  // Démarrage du serveur
  // PORT est imposé par Vercel ; API_PORT sert en local (défaut 3001).
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port);
}

// Pas de top-level await : le lanceur Vercel attend la fin du chargement de ce
// module avant de démarrer le serveur qu'il a capturé ; attendre listen() ici
// le bloque (la promesse de Nest ne se résout qu'une fois le serveur démarré).
void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
