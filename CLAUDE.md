# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Sonar : outil personnel/portfolio sur l'écosystème tech toulousain (annuaire Sirene, **pistes** de candidature spontanée via La Bonne Boîte, agenda, CRM Kanban). Ce n'est **pas** un job board : une *piste* n'est jamais une *offre*. Vocabulaire dans `GLOSSARY.md` (à respecter), décisions produit figées dans `PROJECT_CONTEXT_AND_TODO.md`, détails d'intégration LBB dans `docs/LBB_API.md`, tokens UI dans `docs/DESIGN_TOKENS.md`. Issues : GitHub (`gh`), voir `docs/agents/issue-tracker.md`. ADR éventuels dans `docs/adr/`.

## Architecture

Monorepo **npm workspaces** (pas pnpm/Bun), Node ≥ 22.12 (`.nvmrc`) :

- `apps/api` — NestJS 12, **ESM** (imports relatifs avec extension `.js`, ex. `./app.module.js`). Prisma 7 avec adapter `pg`, client généré dans `src/generated/prisma`. Modules : `auth` (JWT HS256 en cookie `sonar_session`), `sirene` (INSEE, sync admin), `la-bonne-boite` (France Travail OAuth + `GET /leads`, persiste en `RecruitmentSignal`), `health` (ping Postgres), `config` (validation env, CORS, parseur `WEB_ORIGIN`), `prisma`.
- `apps/web` — Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (base-ui). Appelle l'API avec `credentials: 'include'` ; `lib/api/` contient le client et le mapping d'erreurs.
- `packages/api-contract` — types JSON partagés front/back (pas les DTO Nest). Compilé en `dist/` (`prepare: tsc`) : rebuild après modification pour que api/web voient les changements.

Points transverses à connaître :
- **Prisma CLI** doit être lancé via `-w api` (ou depuis `apps/api`) : `prisma.config.ts` charge le `.env` **racine**. Prisma 7 : l'URL n'est plus dans `schema.prisma`.
- **Env** : un seul `.env` à la racine (copier `.env.example`). `NODE_ENV` est obligatoire (`development|test|production`, sensible à la casse) sinon l'API refuse de démarrer.
- **Auth/CSRF** : sur POST/PUT/PATCH/DELETE, `Origin` doit appartenir à `WEB_ORIGIN`. Pas de mutation sur GET. Logout/`sessionVersion` : voir `PROJECT_CONTEXT_AND_TODO.md`.
- **Secrets** (`FT_*`, `INSEE_API_KEY`) : API uniquement, jamais dans le front. Seule variable publique : `NEXT_PUBLIC_API_URL`.
- **Etalab** : toute donnée Sirene/LBB affichée doit citer la source + date de MAJ ; unités en diffusion `"P"` : ne pas rediffuser ni prospecter. Le potentiel 0–100 est toujours attribué à La Bonne Boîte (pas un score Sonar).
- LBB → `RecruitmentSignal`, jamais `JobOpportunity`. 502 LBB ≠ liste vide.

## Commandes (depuis la racine)

```bash
npm run docker:up                          # Postgres 16 sur localhost:5433
npm run prisma:migrate:deploy -w api       # applique les migrations existantes
npm run prisma:migrate -w api              # dev : peut créer une migration
npm run dev                                # web :3000 + api :3001
npm run studio                             # Prisma Studio

npm run test:api                           # vitest (api) — nécessite Postgres + migrations
npm run test:web                           # vitest (web)
npm run lint:api                           # oxlint
npm run lint:web                           # eslint
npm run typecheck -w web
npm run build -w api / -w web
```

Un seul test : `npm run test -w api -- src/auth/auth.service.spec.ts` ou `-- -t "nom du test"` (idem `-w web`, fichiers `*.test.ts(x)` côté web, `*.spec.ts` côté api). E2E api : `npm run test:e2e -w api`. La CI (`.github/workflows/api.yml`) lance seulement migrate deploy + tests unitaires api.

## Conventions du dépôt

- Tests colocalisés avec le code (`*.spec.ts` api, `*.test.ts` web) ; fixtures LBB dans `la-bonne-boite/helpers/search.fixture.ts`.
- Validation d'entrée via DTO class-validator (`ValidationPipe` global : `whitelist` + `forbidNonWhitelisted`).
- Docs et commentaires en français.
