# Sonar

> L’écosystème tech de Toulouse, sans le bruit — annuaire, pistes spontanées, agenda, CRM perso.

Outil **personnel / portfolio**, pas un job board et pas un service officiel. Tu explores les entreprises toulousaines, tu vois qui est une **piste** de candidature spontanée (La Bonne Boîte), tu suis les meetups, tu gères tes relances dans un Kanban.

Deux couches données en V1 :

1. **SIRENE (INSEE)** remplit l’annuaire (Toulouse + 1re couronne, quelques NAF). Le code APE sert à **découvrir** des boîtes, pas à dire « elles recrutent ».
2. **La Bonne Boîte (France Travail)** **marque une piste** (potentiel d’embauche ~6 mois), reliée par SIREN/SIRET.

---

## Features (V1 visée)

- Explorer + fiches entreprise (SIREN, stacks sourcées, signaux)
- Stats hero **calculées en live** (jamais de « 120+ » en dur)
- Page **Pistes** (overlay LBB, ce n’est pas une offre)
- Agenda / Radar (faits sourcés, ex. Toulouse Tech Hub)
- CRM Kanban perso (statuts + historique), isolé par utilisateur
- Attribution **Etalab** (paternité + date de MAJ) ; statut de diffusion SIRENE `"P"` respecté

**Hors V1 :** upload de documents, Hunter / mails auto (Job2Mail), SIRENE France entière, score d’embauche maison, multi-villes, API publique Sonar.

---

## Stack technique

| Couche | Choix |
|---|---|
| Front | Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui, Inter |
| Back | NestJS 12 (ESM), Helmet, ValidationPipe |
| Data | PostgreSQL 16 (Docker, port **5433**), Prisma **7** (`prisma.config.ts`, adapter `pg`) |
| Monorepo | **npm workspaces** (pas pnpm, pas Bun) |
| Node | 24.x (voir `.nvmrc`) |

Secrets (`FT_*`, `INSEE_API_KEY`) : **API seulement**, jamais le front, jamais Git.

---

## Architecture

```text
sonar/
  package.json          # scripts racine (dev, studio, docker)
  docker-compose.yml    # Postgres
  .env.example
  docs/DESIGN_TOKENS.md
  PROJECT_CONTEXT_AND_TODO.md
  apps/web/             # Next — UI
  apps/api/             # Nest — API + Prisma
    prisma/schema.prisma
    prisma.config.ts
```

Workspaces : `npm run … -w web` / `-w api`. En pratique tu restes à la racine.

---

## Charte graphique

Clair **par défaut**. Sombre = classe shadcn `.dark` (bouton lune/soleil). Accent **sky**, surfaces **slate**. Détail : [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md).

---

## Modèle de données (Prisma)

`User`, `Company` (SIREN/SIRET, APE + NAF25, `diffusionStatus`), `Technology`, `CompanyTechnology`, `RecruitmentSignal`, `Community`, `Event`, `JobOpportunity`, `Application` + historique. Idempotence `(source, externalId)` quand l’id externe est présent.

Seed actuel : **technologies seulement**. Pas d’entreprises fictives ; l’annuaire viendra de SIRENE.

---

## Roadmap

Ordre de build :

1. Scaffold (cette init) — **en cours de clôture**
2. SIRENE ciblé → Explorer + fiches + stats live
3. LBB overlay (pistes) + mentions Etalab
4. Toulouse Tech Hub + Radar
5. Auth JWT cookie + CRM
6. Tests / sécu

Le détail coché / restant est dans [`PROJECT_CONTEXT_AND_TODO.md`](PROJECT_CONTEXT_AND_TODO.md).

---

## Variables d’environnement

Copier `.env.example` → `.env` à la **racine** (jamais commit).

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Postgres (compose → `localhost:5433`) |
| `JWT_SECRET` | Auth (plus tard) |
| `FT_CLIENT_ID` / `FT_CLIENT_SECRET` | OAuth France Travail / LBB |
| `INSEE_API_KEY` | Header Sirene `X-INSEE-Api-Key-Integration` |
| `WEB_ORIGIN` | CORS du front (`http://localhost:3000`) |
| `API_PORT` | Nest (`3001`) |

---

## Lancer en local

Depuis `sonar/` :

```bash
cp .env.example .env   # une fois ; coller tes clés localement
npm run docker:up
npm run dev            # web :3000 + api :3001
```

Autres :

```bash
npm run dev:web
npm run dev:api
npm run studio         # Prisma Studio (pas besoin de cd apps/api)
npm run build -w web
npm run build -w api
```

Santé API : `GET http://localhost:3001/health` → `{ "status": "ok" }`.

Prisma CLI (migrate, seed) : depuis `apps/api`, ou `npm run … -w api`, pour que `prisma.config.ts` charge le `.env` racine.

---

## Sources / APIs

- [API Sirene 3.11](https://portail-api.insee.fr/) — INSEE
- [La Bonne Boîte v2](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2) — France Travail
- Réutilisation sous **Licence Ouverte 2.0 (Etalab)** : citer la source + la date de mise à jour. Sonar **n’est pas** un service officiel INSEE / France Travail.
- Unités en diffusion partielle `"P"` : ne pas rediffuser les infos perso, ne pas s’en servir pour prospecter.
