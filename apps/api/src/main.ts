import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
import cookieParser from 'cookie-parser';
import { buildCorsOptions } from './config/cors.options.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
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
  app.enableCors(buildCorsOptions(config.getOrThrow<string>('WEB_ORIGIN')));
  // Démarrage du serveur
  const port = Number(process.env.API_PORT ?? 3001); // Port d'écoute
  await app.listen(port);
}

await bootstrap();
