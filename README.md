# Sonar

> L’écosystème tech de Toulouse, sans le bruit — annuaire, pistes spontanées, agenda, CRM perso.

**[Voir le site en ligne](https://sonar-web-inky.vercel.app)** · Projet personnel / portfolio, **V1 en cours de construction**.

**In short (EN):** Sonar is a personal portfolio project about Toulouse's tech ecosystem. It lists local tech companies from the official French business registry (INSEE Sirene) and flags the ones likely to hire, using France Travail's *La Bonne Boîte* open data, to help with unsolicited applications. It is **not** a job board and **not** an official service. Stack: Next.js 16, NestJS 12, Prisma 7, PostgreSQL, deployed on Vercel. The interface and docs are in French.

Sonar n'est **pas un job board** et **pas un service officiel** (ni INSEE, ni France Travail). Tu explores les entreprises toulousaines, tu vois lesquelles sont une **piste** de candidature spontanée, et plus tard tu suivras les meetups et tes relances dans un Kanban.

---

## Ce qui marche aujourd’hui

- **Annuaire** (`/explorer`) : plus de 1 000 établissements toulousains issus de Sirene (sièges employeurs actifs, Toulouse et 1re couronne, quelques codes NAF tech), filtres par commune et activité, pagination.
- **Pistes** (`/pistes`) : entreprises susceptibles d’embaucher pour un métier donné, d’après La Bonne Boîte, avec le potentiel **0–100** attribué à France Travail. Une piste n’est **pas** une offre d’emploi, et ce potentiel n’est **pas** un score Sonar. La page demande un compte.
- **Compte** : inscription ouverte à tous, connexion et déconnexion (`/register`, `/login`).
- **Site** : accueil avec compteurs calculés en direct depuis la base, thème clair / sombre, menu adapté au téléphone, pages d’erreur.

**Bientôt :** fiche détaillée d’une entreprise, événements et radar (Toulouse Tech Hub), CRM Kanban de candidatures, pages légales.

> Pas de compte à fournir : crée le tien sur `/register` pour voir les pistes. Le site est un projet personnel : les données peuvent être réinitialisées.

---

## Ce que le projet montre

- **Monorepo** npm workspaces : Next.js 16 (App Router, React 19, Tailwind v4, shadcn/ui), NestJS 12 en ESM, Prisma 7 sur PostgreSQL.
- **Authentification** maison : mot de passe haché (bcrypt), JWT dans un cookie HttpOnly, protection CSRF par contrôle de l’`Origin`, limitation de débit sur la connexion et l’annuaire, rôle admin relu en base.
- **Deux API publiques intégrées côté serveur** : INSEE Sirene (clé d’API) et France Travail / La Bonne Boîte (OAuth2), avec retry, backoff, limite de débit et gestion des pannes. Une panne de La Bonne Boîte (502) n’est jamais présentée comme une liste vide.
- **Respect des données ouvertes** : licence Etalab (source et date de mise à jour affichées), unités en diffusion partielle `"P"` non rediffusées.
- **Déploiement Vercel** : site et API en deux projets, une seule origine côté navigateur grâce à une réécriture (le cookie de session reste first-party), base Prisma Postgres. Détail et pièges rencontrés : [`docs/DEPLOIEMENT_VERCEL.md`](docs/DEPLOIEMENT_VERCEL.md).
- **Tests** : plus de 400 tests unitaires côté API, sans aucun appel réel aux API externes ; intégration continue GitHub Actions (migrations + tests API).
- **Méthode** : décisions de produit figées et tracées dans des tickets GitHub, vocabulaire commun dans [`GLOSSARY.md`](GLOSSARY.md).

---

## Stack technique

| Couche | Choix |
|---|---|
| Front | Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui, Inter |
| Back | NestJS 12 (ESM), Helmet, ValidationPipe |
| Data | PostgreSQL 17 (Docker en local, port **5433**), Prisma **7** (`prisma.config.ts`, adapter `pg`) |
| Monorepo | **npm workspaces** (pas pnpm, pas Bun) |
| Node | ≥ 22.12 (voir `.nvmrc`) |
| Hébergement | Vercel (site + API), Prisma Postgres |

Secrets (`FT_*`, `INSEE_API_KEY`) : **API seulement**, jamais le front, jamais Git.

---

## Architecture

```text
sonar/
  package.json          # scripts racine (dev, studio, docker)
  docker-compose.yml    # Postgres
  .env.example
  docs/                 # DESIGN_TOKENS, DEPLOIEMENT_VERCEL, LBB_API
  PROJECT_CONTEXT_AND_TODO.md
  apps/web/             # Next — interface
  apps/api/             # Nest — API + Prisma (prisma/schema.prisma, prisma.config.ts)
  packages/api-contract # Types JSON partagés front / back (pas les DTO Nest)
```

Workspaces : `npm run … -w web` / `-w api`. En pratique tu restes à la racine.

### Charte graphique

Clair **par défaut**. Sombre = classe shadcn `.dark` (bouton lune / soleil). Accent **sky**, surfaces **slate**. Détail : [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md).

### Modèle de données (Prisma)

`User`, `Company` (SIREN/SIRET, APE + NAF25, `diffusionStatus`), `Technology`, `CompanyTechnology`, `RecruitmentSignal`, `Community`, `Event`, `JobOpportunity`, `Application` + historique. Idempotence `(source, externalId)` quand l’id externe est présent.

Une piste La Bonne Boîte est un `RecruitmentSignal` rattaché à une `Company`, jamais un `JobOpportunity`. Seed : **technologies seulement**, aucune entreprise fictive ; l’annuaire vient de Sirene.

---

## Roadmap

Le détail coché est dans [`PROJECT_CONTEXT_AND_TODO.md`](PROJECT_CONTEXT_AND_TODO.md).

1. Scaffold Nest + Next + Prisma + Docker — **fait**
2. Sirene ciblé (provider Nest, synchro admin) + annuaire public `/explorer` — **fait** ; fiche d’une entreprise **à venir**
3. Authentification par cookie JWT, pages `/login` `/register`, pages d’erreur — **fait**
4. La Bonne Boîte (`GET /leads`, page `/pistes`, mentions Etalab) — **fait**
5. Navigation et design du site (menu, en-tête, pied de page, accueil) — **fait** ; retouches de design en cours
6. Déploiement Vercel — **fait** (site et API en ligne)
7. Fiche entreprise, pages légales — **prochain**
8. Toulouse Tech Hub + Radar
9. CRM Kanban

---

## API exposée

Sur le site déployé, l’API est relayée sous `/api` (même origine que le site). En local : `http://localhost:3001`.

| Méthode | Chemin | Auth |
|---|---|---|
| `POST` | `/auth/register`, `/auth/login` | CSRF (`Origin` ∈ liste `WEB_ORIGIN`) |
| `POST` | `/auth/logout` | CSRF ; 204, efface toujours le cookie |
| `GET` | `/auth/me` | cookie `sonar_session` ; le site ne l’appelle que si le cookie indice `sonar_session_hint` est présent (jamais utilisé pour autoriser) |
| `GET` | `/companies` | public ; query `city`, `activityCode`, `page`, `pageSize` (max 50) ; sièges Sirene hors diffusion « P » ; throttle 60 req / 60 s |
| `GET` | `/health` | public ; ping Postgres |
| `GET` | `/leads?rome=M1805` | cookie `sonar_session` ; query `rome` obligatoire, `page` / `pageSize` optionnels |
| `GET` | `/sirene/:siret` | session |
| `POST` | `/sirene/sync` | session **admin** |

`GET /leads` appelle France Travail puis persiste (`saveLead`). Sans cookie → 401. Sans `rome` → 400. La Bonne Boîte indisponible → 502. Throttle : 10 req / 60 s.

---

## Développement

### Variables d’environnement

Copier `.env.example` → `.env` à la **racine** (jamais commit).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Postgres, adresse **directe** (compose → `localhost:5433`) : CLI Prisma (migrations, generate, seed) et repli de l'application |
| `DATABASE_URL_POOLED` | Optionnelle : adresse Postgres via pooler, utilisée par l'application au runtime (sinon `DATABASE_URL`) |
| `JWT_SECRET` | Cookie de session `sonar_session` (HS256) |
| `FT_CLIENT_ID` / `FT_CLIENT_SECRET` | OAuth France Travail / LBB (détails : [`docs/LBB_API.md`](docs/LBB_API.md)) |
| `INSEE_API_KEY` | Header Sirene `X-INSEE-Api-Key-Integration` |
| `NODE_ENV` | **Obligatoire** : `development`, `test` ou `production` (sensible à la casse). Sans lui l'API refuse de démarrer ; en `production` : cookie `secure` + garde `WEB_ORIGIN` |
| `WEB_ORIGIN` | Origines web autorisées (CORS + CSRF), séparées par des virgules (`http://localhost:3000,http://192.168.1.20:3000`). En production : pas de localhost ni d'IP privée |
| `TRUST_PROXY_HOPS` | Optionnel : nombre de proxies devant l'API (entier ≥ 0). Absent = aucun proxy ; autre valeur = l'API refuse de démarrer. Les limites par IP comptent alors le visiteur, pas le relais |
| `NEXT_PUBLIC_API_URL` | **À mettre dans `apps/web/.env.local`** (Next ne lit pas le `.env` racine). Base de l’API vue par le navigateur : URL absolue en local (`http://localhost:3001`), chemin relatif `/api` en production (même origine que le site). Seule variable publique du web ; jamais de `FT_*` / `INSEE_*` ici |
| `API_DIRECT_URL` | **À mettre dans `apps/web/.env.local`.** Optionnel, serveur uniquement : adresse réelle de l’API. Si définie, Next relaie `/api/*` vers elle et l’annuaire rendu côté serveur l’utilise. Vide en local |
| `API_PORT` | Nest (`3001`) |

Déploiement sur Vercel (variables par projet, migrations, rôle `ADMIN`, liste de contrôle) : [`docs/DEPLOIEMENT_VERCEL.md`](docs/DEPLOIEMENT_VERCEL.md).

### Lancer en local

Depuis `sonar/` :

```bash
cp .env.example .env   # une fois ; coller tes clés localement
npm run docker:up
npm run prisma:migrate:deploy -w api   # applique les migrations déjà commitées (Postgres doit tourner)
npm run dev            # web :3000 + api :3001
```

> **Passage à Postgres 17** : un volume local créé avec Postgres 16 ne démarre pas sous 17. Il faut repartir d'un volume neuf : `docker compose down -v` (**EFFACE les données locales**), puis `npm run docker:up` et `npm run prisma:migrate:deploy -w api`.

Autres commandes :

```bash
npm run dev:web
npm run dev:api
npm run studio         # Prisma Studio (pas besoin de cd apps/api)
npm run test:api       # Vitest API (Postgres + migrations requis)
npm run test:web       # Vitest web
npm run build -w web
npm run build -w api
```

Santé API : `GET http://localhost:3001/health`. Postgres décide du process (`200` / `status: ok`, ou `503` / `status: down`). Sirene et La Bonne Boîte sont des dépendances `unchecked` : elles ne font pas échouer la route.

```json
{ "status": "ok", "process": { "postgres": "up" }, "dependencies": { "sirene": "unchecked", "laBonneBoite": "unchecked" } }
```

Prisma CLI : depuis `apps/api`, ou `npm run … -w api`, pour que `prisma.config.ts` charge le `.env` racine.

- `npm run prisma:migrate -w api` — développement : peut **créer** un fichier de migration.
- `npm run prisma:migrate:deploy -w api` — applique les fichiers déjà présents, sans en inventer (Docker Postgres `:5433` allumé).
- La CI GitHub Actions (`.github/workflows/api.yml`) lance `prisma migrate deploy` puis les tests unitaires `api` sur Postgres 17 (port 5432).

---

## Sources et licences

- [API Sirene 3.11](https://portail-api.insee.fr/) — INSEE
- [La Bonne Boîte v2](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2) — France Travail ; intégration Nest : [`docs/LBB_API.md`](docs/LBB_API.md)
- Réutilisation sous **Licence Ouverte 2.0 (Etalab)** : source + date de mise à jour citées. Sonar **n’est pas** un service officiel INSEE / France Travail.
- Unités en diffusion partielle `"P"` : infos personnelles non rediffusées, non utilisées pour prospecter.
