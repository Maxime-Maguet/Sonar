export function buildCorsOptions(webOrigin: string) {
  return {
    origin: webOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'], // Méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // En-têtes autorisés
    credentials: true, // Autorise les cookies et les sessions cross-origin
  };
}
