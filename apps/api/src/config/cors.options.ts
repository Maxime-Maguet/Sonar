import { parseWebOrigins } from './web-origins.js';

export function buildCorsOptions(webOrigin: string) {
  const origins = parseWebOrigins(webOrigin);
  return {
    // Une seule origine : chaîne. Plusieurs : tableau, la lib `cors`
    // renvoie alors l'origine de l'appelant si elle est dans la liste.
    origin: origins.length === 1 ? origins[0] : origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'], // Méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
    credentials: true, // Autorise les cookies et les sessions cross-origin
  };
}
