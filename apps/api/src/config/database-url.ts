// Choix de l'adresse Postgres utilisée par l'application au runtime.
// DATABASE_URL_POOLED (pooler) prime ; sinon repli sur DATABASE_URL (directe).
// Les migrations Prisma CLI lisent toujours DATABASE_URL (prisma.config.ts).
export function resolveDatabaseUrl(env: {
  DATABASE_URL?: string;
  DATABASE_URL_POOLED?: string;
}): string {
  const pooled = env.DATABASE_URL_POOLED?.trim();
  if (pooled) return pooled;

  const direct = env.DATABASE_URL?.trim();
  if (direct) return direct;

  throw new Error('DATABASE_URL is required');
}
