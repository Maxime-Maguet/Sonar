import type { INestApplication } from '@nestjs/common';
import { assertWebOriginsAllowed, type WebOrigins } from './web-origins.js';

export function buildCorsOptions(origins: WebOrigins, nodeEnv?: string) {
  if (origins.length === 0) {
    throw new Error('WEB_ORIGIN : liste vide');
  }
  // Garde indépendante de la validation d'env.
  assertWebOriginsAllowed(origins, nodeEnv);
  return {
    // Une seule origine : chaîne. Plusieurs : tableau, la lib `cors`
    // renvoie alors l'origine de l'appelant si elle est dans la liste.
    origin: origins.length === 1 ? origins[0] : [...origins],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'], // Méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
    credentials: true, // Autorise les cookies et les sessions cross-origin
  };
}

export function applyCors(
  app: Pick<INestApplication, 'enableCors'>,
  origins: WebOrigins,
  nodeEnv?: string,
): void {
  app.enableCors(buildCorsOptions(origins, nodeEnv));
}
