# Sonar — Contexte produit et TODO

**Décision :** La Bonne Boîte fait partie de la **V1**. Ce n’est pas un bonus V2.  
Le planning 10 jours peut dépasser : on privilégie les pistes de candidature spontanée.

**Échelle :** Explorer + Pistes LBB + agenda + CRM perso. Pas un deuxième produit. Une seule liste ci-dessous, **dans l’ordre**. On ne stocke plus le socle Nest (DTO, env, erreurs) dans une « phase 6 qualité » à la fin.

Hors V1 (produit **et** socle) : upload, Hunter / mails auto, SIRENE France entière, score calculé par Sonar, multi-villes, API publique, circuit breaker, refresh tokens, versioning `/v1`, soft-delete annuaire, K8s. Le potentiel d’embauche **France Travail** (0–100), lui, est en V1.

---

## Décisions figées (ne plus rediscuter)

- **Produit :** centraliser les entreprises tech de Toulouse, et parmi elles celles qui peuvent embaucher. Agenda + CRM perso en plus. Pas un job board.
- **Deux couches données (cœur V1) :**
  1. **SIRENE ciblé** (Toulouse + 1re couronne + quelques codes NAF) = **l’annuaire**. Le NAF sert à découvrir des entreprises, pas à dire « elles recrutent ».
  2. **La Bonne Boîte** = **qui peut embaucher** pour un métier, sur ~6 mois. Relier par SIREN/SIRET. Une société sans signal reste une fiche d’annuaire. Une société avec un signal `POTENTIAL_RECRUITMENT` est une piste pour ce ROME.
- **Potentiel France Travail en V1** (rouvert le 12 oct. 2026, OpenAPI LBB v2.27.3) : `hiring_potential` est un nombre **0–100** (ou absent). `is_high_potential` est un booléen (ou absent) : « fort potentiel », pas « cette ligne n’est pas une piste ». L’exemple officiel du schéma est une entreprise renvoyée par `/recherche` avec `is_high_potential: false`. On **garde** les deux sur le signal et on les **affiche** dans `GET /leads` et sur `/pistes`, toujours attribués à La Bonne Boîte. On ne recalcule pas, on ne filtre pas les `false`. L’ordre de la liste reste celui de France Travail (score décroissant).
- **Pas un job board.** Les pistes LBB = potentiel d’embauche, pas des offres.
- **Pas Job2Mail :** pas de Hunter, pas de chasse aux mails de dirigeants, pas d’envoi / relance automatique.
- **La Bonne Boîte = V1.** L’app doit quand même rester utilisable si l’API est down (Explorer, events, CRM). Idem si SIRENE est down : l’annuaire déjà importé reste lisible.
- **Licence Etalab (Licence Ouverte 2.0) :** réutilisation OK sous réserve de **paternité + date de mise à jour**, sans laisser croire que Sonar est un service officiel (INSEE / France Travail).
- **Stats hero :** compteurs **calculés en live** depuis la BDD (pas de « 120+ » en dur).
- **Stacks V1 :** enrichissement manuel + mention de la source (`SEED_MANUAL`, etc.).
- **Documents CRM / upload fichiers :** hors V1.
- **Secrets** (`FT_*`, `INSEE_API_KEY`) : uniquement côté API NestJS (`.env`), jamais dans le front ni dans Git.
- **SIRENE (INSEE) — règles officielles (sept. 2026) :**
  - API **3.11** = version de référence (Sirene 4).
  - Aujourd’hui : code APE **en vigueur (NAF Rev2)** **et** le futur **NAF 2025** (champs `activitePrincipaleNAF25*`, informatifs jusqu’à janv. 2027).
  - **1er janv. 2027** : les APE passent en NAF 2025 ; vers le **5–6 janv. 2027** l’API ne gardera plus que NAF25 dans les champs « activité principale » courants. L’historique n’est **pas** réécrit en NAF25.
  - On interroge **unités légales (SIREN)** + **établissements (SIRET)** : la géo Toulouse = l’établissement.
  - **Statut de diffusion partielle `"P"`** (ex-non-diffusible `"N"`) : **ne pas** rediffuser les infos perso, **ne pas** les utiliser pour de la prospection (art. R123-232-1). Ça va dans le même sens que « pas Hunter / pas mail auto ».
- **LBB = `RecruitmentSignal`**, jamais `JobOpportunity`. CRM : `Application` → `Company` (+ signal optionnel).
- **Session V1 :** un JWT HS256 dans le cookie `sonar_session` (HttpOnly, SameSite=Lax, Path=/, Secure en prod), durée 24 h, champ `ver` = `User.sessionVersion`. Incrémenter `sessionVersion` révoque tous les tickets. Réémission glissante si le JWT a déjà vécu plus de 12 h. Refresh token = V2. Logout efface toujours le cookie et n'incrémente `sessionVersion` que si le JWT est encore valide et `ver` correspond ; email stocké en trim+lowercase ; échec de login = une seule 401 ; `cookie-parser` remplit `request.cookies`. DTO, throttle login et CORS `WEB_ORIGIN` sont en place.
- **CSRF V1 :** sur POST / PUT / PATCH / DELETE, `Origin` doit être strictement présente dans la liste `WEB_ORIGIN` (origines séparées par des virgules, parseur partagé `config/web-origins.ts`). Pas de double-submit (cookie API illisible depuis le front). Pas de mutation sur GET.

---

## Accès APIs (21 sept. 2026)

**La Bonne Boîte** — [catalogue](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2) · impl. [`docs/LBB_API.md`](docs/LBB_API.md)

- [x] Compte francetravail.io + app + API LBB v2 habilitée
- [x] `FT_CLIENT_ID` / `FT_CLIENT_SECRET` dans `.env` local
- [x] Test Postman token + `GET /nombreEntreprise` (Toulouse `31555`, ROME `M1805`)
- [x] Lire le Swagger (liste, pagination, SIRET) avant le provider Nest — contrat dans `docs/LBB_API.md` + fixture `apps/api/src/la-bonne-boite/helpers/search.fixture.ts`

**Sirene INSEE**

- [x] Compte portail + app Simple + plan Public (`X-INSEE-Api-Key-Integration`)
- [x] `INSEE_API_KEY` dans `.env` local
- [x] Test un SIRET toulousain via le backend

---

## Déjà fait (ne plus rouvrir)

- [x] Monorepo, Docker Postgres `:5433`, Nest + Next, Prisma 7, Tailwind/shadcn, `.env.example`
- [x] Schéma Prisma + seed technologies (pas d’entreprises fictives)
- [x] Helmet + CORS + ValidationPipe **global** dans `main.ts` (le pipe ne sert que quand il y a des DTO)
- [x] Sirene : fetch → normalize (`"P"`) → upsert un SIRET (`src/sirene`)
- [x] Filtre Prisma global dans `main.ts` : JSON `statusCode`, `code`, `message` (pas de stack, pas le message Prisma)
- [x] Docs : un seul nom `INSEE_API_KEY`

---

## À faire — une seule file (ouvrir le bloc, le finir, passer au suivant)

### A — Fondations Nest (avant toute nouvelle route)

- [x] Exceptions métier (`NotFound`, `BadRequest`, `UpstreamUnavailable`…) — plus de `throw new Error()`
- [x] Logger Nest structuré ; **zéro** `console.log` de fiche ; rédaction `"P"` (pas de nom/rue en log). `PrismaService` logue déjà connect / disconnect
- [x] Validation des env **au boot** (`DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `INSEE_API_KEY`, `FT_*`) — l’app refuse de démarrer si ça manque

### B — Auth (bloque le CRM + ferme Sirene)

DTO login/register, throttle login, cookies et CORS **sont ici**, pas dans une phase « qualité ».

- [x] Hash mot de passe (bcrypt, 12 rounds, via `PasswordService`)
- [x] JWT en cookie HttpOnly + flags (`Secure` en prod, `SameSite`, `Path`)
- [x] CSRF (origines `:3000` / `:3001`)
- [x] POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me : corps `{ id, email }` seulement (register 201, login 200, logout 204), JWT uniquement dans `sonar_session`.
- [x] DTO + validation sur register/login
- [x] Throttle login
- [x] CORS : origine = `WEB_ORIGIN` uniquement, **pas** de fallback `localhost` si `NODE_ENV=production`
- [ ] Isolation CRM par `userId` (quand le CRM existe). Unicité `(userId, companyId)` déjà en base ; le scoping des requêtes reste au CRUD (en attente)
- [x] Couper `POST /sirene/:siret/create` public (session + rôle `ADMIN` en base, relu à chaque appel ; `GET /sirene/:siret` reste public)

### C — Contrats HTTP

Dès qu’un endpoint est créé (ci-dessous) : DTO entrée, DTO **sortie** (jamais Prisma brut), pipe, pagination bornée. Pas un chantier séparé.

- [x] Sirene : pipe SIRET 14 chiffres + DTO de sortie (la GET de test peut rester)

### D — Providers API (annuaire + pistes)

**Sirene** — Sirene est complétée et terminée (`src/sirene`)

- [x] `prisma migrate deploy` + apply Docker/CI
- [x] Communes Toulouse + 1re couronne + NAF découverte **en config** (ex. 62.01Z, 62.02A, 58.29C, 62.09Z en NAF Rev2 ; liste ajustable, pas toute la France)
- [x] Garder APE + nomenclature (`NAFRev2` / `NAF25`) ; ne pas filtrer comme si les codes 2026 restaient valides après janv. 2027
- [x] Retry / backoff (429, 5xx, timeout) ; throttle de sync
- [x] `Company.source` + `lastSyncedAt` (crédit Etalab, pas seulement `updatedAt`)
- [x] Index listes : `city`, `activityCode`, `companyType` (quand Explorer existe)
- [x] Tests mock : normalize `"P"`, upsert SIREN, **aucun** appel INSEE réel

**La Bonne Boîte**

- [x] Module `src/la-bonne-boite/` : fetch → normalize → upsert (le domaine ne parle pas à France Travail)
- [x] OAuth2 client_credentials **Nest seulement** (`docs/LBB_API.md`) ; cache token ; timeout ; retry ; ≤ **2 req/s** ; gérer **429**
- [x] Overlay : une piste = une `Company` déjà là (SIREN/SIRET). SIRET LBB absent de l’annuaire → fiche minimale sourcée LBB, **pas** de fusion au nom
- [x] Signal `POTENTIAL_RECRUITMENT` + `source = LA_BONNE_BOITE` + `externalId` + `detectedAt` — **pas** `JobOpportunity`
- [x] `GET /leads` : métier ROME, zone Toulouse durcie (`citycode` 31555, `distance` 10), pagination, DTO, session (`AuthGuard`, pas admin). Write-on-GET (search + `saveLead`)
- [x] Tests mock : normalisation, `saveLead`, `list` (idempotence, SIRET skip, 502), **aucun** appel FT réel

### E — Health

- [ ] `GET /health` : ping **BDD** = process. SIRENE/LBB = deps pour le front. Un provider down **ne tue pas** l’API.

### F — Front (le site)

Socle UI

- [x] Client HTTP unique, `credentials: 'include'`, **aucun** secret INSEE/FT en `NEXT_PUBLIC_*` (pages `/login` `/register` ; 401 géré par la page, pas le client)
- [ ] `error.tsx` / `not-found.tsx` ; `loading.tsx` / skeletons sur les listes (squelette **Pistes** déjà en place)
- [ ] Header / Hero / Footer produit (badge Toulouse, nav : Explorer, Événements, Radar, Pistes, CRM) — en-tête **minimal** Accueil / Pistes / Connexion + footer Etalab sur `/pistes` déjà là
- [ ] Pages légales : mentions, confidentialité (compte + CRM + `"P"` + cookie de session)

Explorer & fiches

- [ ] **Stats hero en live** (count companies, techs distinctes, events du mois) — jamais de « 120+ » en dur
- [ ] `GET /companies` + page `/explorer` : filtres URL (`tech` cumulatif AND, type, ville), pagination, DTO
- [ ] Cartes entreprise
- [ ] Fiche `/explorer/[slug]` : SIREN, adresse selon `"P"`, stacks sourcées (`SEED_MANUAL`, etc.), signaux, events, CTA « ajouter au CRM »
- [ ] Bloc « Piste spontanée » sur la fiche s’il existe un signal LBB

Pistes

- [x] Page `/pistes` : liste, filtres métier, potentiel France Travail (0–100) et repère « fort potentiel », mention « ce n’est pas une offre d’emploi » et « ce n’est pas un score Sonar ». Bouton CRM **désactivé** (« bientôt ») ; `TO_CONTACT` = CRUD CRM plus bas
- [x] Si LBB down : **cette page** en erreur (502 ≠ liste vide ≠ API éteinte) ; le reste du site ne dépend pas de LBB
- [x] Attribution Etalab (footer **et** page Pistes) :
  - [x] France Travail / La Bonne Boîte + **lien**
  - [x] Date de dernière récupération LBB (`fetchedAt`) ; repli si indisponible
  - [x] Phrase : infos **indicatives** ; Sonar **n’est pas** un service officiel
  - [x] Crédit INSEE / Sirene (source + lien) ; date Sirene live (`lastSyncedAt`) pas encore (pas de changement `GET /leads`)

Agenda / Radar _(API TTH dans la section suivante)_

- [ ] Pages `/events` et `/radar` (faits sourcés, pas de score opaque)

CRM

- [ ] CRUD candidatures scoppé `userId` + historique de statuts
- [ ] Kanban `/crm` (8 statuts, drag & drop)
- [ ] Dashboard : relances du jour, pistes/nouveautés, events 7 jours
- [ ] Création de candidature **depuis une piste LBB** (lien `Company` + signal, pas une « offre »)
- [ ] Unique métier : une carte par `(userId, companyId)` (contrainte SQL en place ; le CRUD doit s’y appuyer)
- [ ] Suppression compte / données CRM (hard-delete User + candidatures ; **pas** de `deletedAt` sur l’annuaire)

### G — CI

- [ ] Scripts racine `lint` / `typecheck` / `test` / `build`
- [ ] GitHub Actions (pas de K8s)
- [ ] E2E Playwright **après** le CRM : login → explorer → fiche → piste → CRM → historique

### Agenda API (après LBB, avant ou après le Kanban)

- [ ] Adapter Toulouse Tech Hub (ICS/JSON), idempotence `(source, externalId)`
- [ ] Cron quotidien (ex. 04:00 Europe/Paris), un run à la fois

---

**Prochain code : Health BDD (bloc E)**, puis le reste du front (Explorer, nav produit, pages légales). Ne pas rouvrir Sirene ni `GET /leads` sauf bug. CRM et agenda restent plus bas dans la file.
