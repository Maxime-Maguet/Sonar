/** Limiteur nommé : `limit` requêtes par fenêtre de `ttl` millisecondes. */
export interface ThrottlerOptions {
  name: string;
  limit: number;
  ttl: number;
}

/** Surcharge par route ou par classe via `@Throttle`. */
export type ThrottleOverrides = Record<string, { limit: number; ttl: number }>;

export interface ThrottlerHitResult {
  /** Nombre de requêtes comptées dans la fenêtre (limit + 1 quand bloqué). */
  totalHits: number;
  /** Secondes avant que la plus ancienne requête sorte de la fenêtre. */
  timeToExpire: number;
  isBlocked: boolean;
  /** Secondes avant la fin du blocage (0 si non bloqué). */
  timeToBlockExpire: number;
}
