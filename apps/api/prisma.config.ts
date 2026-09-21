/**
 * Prisma 7 : la CLI (generate, migrate, seed) lit CE fichier, plus `url`
 * dans schema.prisma. C’est la config “outils”, pas le client Nest au runtime.
 *
 * Nest utilise PrismaService + @prisma/adapter-pg + DATABASE_URL à part.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

/**
 * ESM n’a pas `__dirname`. `import.meta.url` = file:///…/prisma.config.ts
 * → on le convertit en chemin disque, puis `dirname` = dossier apps/api.
 */
const apiRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Prisma 7 ne charge plus .env tout seul. On le fait ici, dans cet ordre :
 * 1) .env à la racine du monorepo (celui qu’on copie depuis .env.example)
 * 2) apps/api/.env s’il existe — écrase les mêmes clés (priorité locale)
 */
loadEnv({ path: path.resolve(apiRoot, "../../.env") });
loadEnv({ path: path.resolve(apiRoot, ".env") });

export default defineConfig({
  // Modèles / enums : “à quoi ressemble la BDD”
  schema: "prisma/schema.prisma",

  migrations: {
    // SQL versionné (ex. prisma/migrations/20260921162015_init/)
    path: "prisma/migrations",
    // `npx prisma db seed` : tsx exécute du TypeScript sans compiler
    seed: "npx tsx prisma/seed.ts",
  },

  datasource: {
    // `env("DATABASE_URL")` : obligatoire, erreur claire si la var manque
    // (mieux que process.env.DATABASE_URL qui peut être undefined)
    url: env("DATABASE_URL"),
  },
});
