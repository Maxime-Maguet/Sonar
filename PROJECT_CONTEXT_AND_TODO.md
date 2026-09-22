# Sonar — Contexte produit et TODO

**Décision :** La Bonne Boîte fait partie de la **V1**. Ce n’est pas un bonus V2.  
Le planning 10 jours peut dépasser : on privilégie les pistes de candidature spontanée.

---

## Décisions figées (ne plus rediscuter)

- **Produit :** cartographie tech Toulouse + signaux + agenda + CRM perso + **pistes spontanées**.
- **Deux couches données (cœur V1) :**
  1. **SIRENE ciblé** (Toulouse + 1re couronne + quelques codes NAF) = **remplit l’annuaire**. Le NAF sert à découvrir des entreprises, pas à dire « elles recrutent ».
  2. **La Bonne Boîte** = **marque qui est une piste** (potentiel d’embauche ~6 mois). Relier par SIREN/SIRET. Le NAF ne dit pas ça.
- **Pas un job board.** Les pistes LBB = potentiel d’embauche, pas des offres.
- **Pas Job2Mail :** pas de Hunter, pas de chasse aux mails de dirigeants, pas d’envoi / relance automatique.
- **La Bonne Boîte = V1.** L’app doit quand même rester utilisable si l’API est down (Explorer, events, CRM). Idem si SIRENE est down : l’annuaire déjà importé reste lisible.
- **Licence Etalab (Licence Ouverte 2.0) :** réutilisation OK sous réserve de **paternité + date de mise à jour**, sans laisser croire que Sonar est un service officiel (INSEE / France Travail).
- **Stats hero :** compteurs **calculés en live** depuis la BDD (pas de « 120+ » en dur).
- **Stacks V1 :** enrichissement manuel + mention de la source (`SEED_MANUAL`, etc.).
- **Documents CRM / upload fichiers :** hors V1.
- **Secrets** (`FT_*`, `INSEE_TOKEN`) : uniquement côté API NestJS (`.env`), jamais dans le front ni dans Git.
- **SIRENE (INSEE) — règles officielles (sept. 2026) :**
  - API **3.11** = version de référence (Sirene 4).
  - Aujourd’hui : code APE **en vigueur (NAF Rev2)** **et** le futur **NAF 2025** (champs `activitePrincipaleNAF25*`, informatifs jusqu’à janv. 2027).
  - **1er janv. 2027** : les APE passent en NAF 2025 ; vers le **5–6 janv. 2027** l’API ne gardera plus que NAF25 dans les champs « activité principale » courants. L’historique n’est **pas** réécrit en NAF25.
  - On interroge **unités légales (SIREN)** + **établissements (SIRET)** : la géo Toulouse = l’établissement.
  - **Statut de diffusion partielle `"P"`** (ex-non-diffusible `"N"`) : **ne pas** rediffuser les infos perso, **ne pas** les utiliser pour de la prospection (art. R123-232-1). Ça va dans le même sens que « pas Hunter / pas mail auto ».

---

## France Travail / La Bonne Boîte — état accès (21 sept. 2026)

- [x] Compte créé sur [francetravail.io](https://francetravail.io)
- [x] Application créée (identifiant client + clé secrète obtenus)
- [x] API **La Bonne Boîte v2** associée / habilitée pour l’application
- [x] Stocker `FT_CLIENT_ID` / `FT_CLIENT_SECRET` dans `.env` local (jamais commit)
- [x] Appel de test Postman : token OAuth + `GET /nombreEntreprise` (Toulouse `31555`, ROME `M1805`) — **OK sept. 2026**
- [ ] Lire le contrat complet Swagger (liste entreprises, pagination, champs SIRET) pour le provider Nest

Catalogue : [La Bonne Boîte v2](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2)

**Référence implémentation backend** (OAuth URL, scopes, base API, exemples) : [`docs/LBB_API.md`](docs/LBB_API.md).

---

## INSEE / API Sirene — état accès (21 sept. 2026)

- [x] Compte [portail-api.insee.fr](https://portail-api.insee.fr/) (connexion externes)
- [x] Application **Sonar** créée en mode **Simple** (pas mTLS / PEM)
- [x] Souscription **API Sirene** plan **Public** — clé `X-INSEE-Api-Key-Integration` obtenue
- [x] Stocker la clé dans `.env` local (`INSEE_TOKEN` ou `INSEE_API_KEY`) — jamais Git, jamais le chat
- [x] Appel de test (un SIRET toulousain) une fois le backend en place

---

## TODO — PHASE 0 — Dossiers & Git

- [x] 0.1 Créer le monorepo `sonar` (Git, workspaces `apps/*`)
- [x] 0.2 `docker-compose` PostgreSQL (port test 5433)
- [x] 0.3 Structures `apps/api` (NestJS) et `apps/web` (Next.js App Router)
- [x] 0.4 Prisma **7+** : `prisma.config.ts`, pas de `url` dans `schema.prisma`, generator `prisma-client`, adapter PostgreSQL
- [x] 0.5 Tailwind v4 + shadcn, clair par défaut, sombre via `.dark` (toggle), accent sky (`docs/DESIGN_TOKENS.md`)
- [x] 0.6 `.env.example` avec `DATABASE_URL`, `FT_CLIENT_ID`, `FT_CLIENT_SECRET`, `INSEE_API_KEY` (valeurs vides)

---

## TODO — PHASE 1 — Backend core & auth

- [x] 1.1 Schéma Prisma (User, Company, Technology, Event, Signal, JobOpportunity, Application, historique, contraintes `@@unique([source, externalId])`)
- [x] 1.2 Seed **technologies** (16 stacks) — pas de seed entreprises ; le volume de l’annuaire vient de SIRENE
- [x] 1.3 `GET /health`
- [ ] 1.4 Auth JWT cookie HttpOnly (`/auth/register`, `/login`, `/logout`) + isolation CRM par `userId`

---

## TODO — PHASE 1b — SIRENE ciblé (annuaire V1)

Objectif : **remplir Explorer** comme Job2Mail (zone + NAF), **sans** enrichissement contacts.

- [x] 1b.1 Compte / jeton [API Sirene INSEE](https://portail-api.insee.fr/) (`INSEE_TOKEN`) — **obtenu 21 sept. 2026**
- [ ] 1b.2 Provider isolé `providers/sirene/` (API **3.11**) : fetch → normalize → upsert. Identité = **SIREN** ; localisation Toulouse = **SIRET** (établissement)
- [ ] 1b.3 Périmètre **figé** : communes Toulouse + 1re couronne ; NAF de découverte (ex. 62.01Z, 62.02A, 58.29C, 62.09Z **en NAF Rev2** aujourd’hui) — liste ajustable, pas « toute la France »
- [ ] 1b.4 Stocker **code APE + nomenclature** (`NAFRev2` / `NAF25`) ; garder aussi `activitePrincipaleNAF25*` tant qu’INSEE les envoie (transition jusqu’à janv. 2027). **Ne pas** filtrer en dur comme si les codes 2026 restaient valides après le cut-over
- [ ] 1b.5 Unités **diffusion partielle `"P"`** : ne pas afficher / redistribuer les données perso, ne pas s’en servir pour prospecter (exclure ou fiche minimale sans identité personnelle)
- [ ] 1b.6 Sync contrôlée (pas un crawl continu) : timeout, retry, cache, logs ; une panne SIRENE ne casse pas LBB ni le CRM
- [ ] 1b.7 Credit INSEE / SIRENE (source + date de MAJ) à côté du credit LBB
- [ ] 1b.8 Tests : normalisation, upsert SIREN, respect du statut `P`, pas d’appel réel INSEE dans les unitaires (mock)

---

## TODO — PHASE 2 — Explorer & fiches

- [ ] 2.1 Header / Hero / Footer (badge Toulouse, nav Explorer, Événements, Radar, Pistes, CRM)
- [ ] 2.2 **Stats en live** (count companies, techs distinctes, events du mois) — jamais de placeholders mensongers
- [ ] 2.3 `GET /companies` + filtres URL (`tech` cumulatif AND, type, ville)
- [ ] 2.4 Cartes entreprise + fiche `/explorer/[slug]` (SIREN, stacks sourcées, signaux, events, CTA CRM)

---

## TODO — PHASE 3 — Providers agenda & Radar

- [ ] 3.1 Adapter Toulouse Tech Hub (ICS/JSON), idempotence `(source, externalId)`
- [ ] 3.2 Cron quotidien (ex. 04:00 Europe/Paris)
- [ ] 3.3 Pages `/events` et `/radar` (faits sourcés, pas de score opaque)

---

## TODO — PHASE 4 — La Bonne Boîte (V1, prioritaire)

Objectif UX : un endroit pour voir des **pistes de candidature spontanée** (Toulouse + métier).

- [ ] 4.1 Module `providers/la-bonne-boite/` isolé : fetch → normalize → upsert (le domaine ne parle pas à France Travail)
- [ ] 4.2 OAuth2 client_credentials **côté NestJS** uniquement (voir [`docs/LBB_API.md`](docs/LBB_API.md) : token `authentification-partenaire…`, scope `search office api_labonneboitev2`, base `api.francetravail.io/partenaire/labonneboite/v2`) ; timeout, retry, rate limit ≤ **2 req/s**
- [ ] 4.3 Sync (ex. hebdo ou à la demande) : **overlay** sur l’annuaire SIRENE — une piste = une `Company` déjà là (SIREN/SIRET). Si LBB connaît un SIRET absent de l’annuaire : fiche minimale sourcée LBB, **pas** de fusion au nom.
- [ ] 4.4 Modèle / signaux : type explicite du genre `POTENTIAL_RECRUITMENT` + `source = LA_BONNE_BOITE` + `externalId` + `detectedAt`
- [ ] 4.5 API `GET /leads` (ou `/pistes`) : métier (ROME), zone Toulouse / couronne, pagination
- [ ] 4.6 Page front **`/pistes`** : liste, filtres métier, « ce n’est pas une offre d’emploi », bouton **Ajouter au CRM** (`TO_CONTACT`)
- [ ] 4.7 Bloc « Piste spontanée » sur la fiche entreprise si un signal LBB existe
- [ ] 4.8 **Attribution Etalab (obligatoire)** :
  - [ ] Mention France Travail / La Bonne Boîte + **lien** vers la source
  - [ ] **Date de dernière mise à jour** des données affichées
  - [ ] Phrase : informations **indicatives** ; Sonar **n’est pas** un service officiel France Travail
  - [ ] Footer (et page Pistes) : même crédit
- [ ] 4.9 Si API indisponible / non associée : page Pistes en état d’erreur, **le reste de l’app continue**
- [ ] 4.10 Tests : normalisation, idempotence, isolation (pas d’appel LBB dans les tests unitaires métier — mock du provider)

---

## TODO — PHASE 5 — CRM Kanban & dashboard

- [ ] 5.1 CRUD candidatures scoppé `userId` + historique de statuts
- [ ] 5.2 Kanban `/crm` (8 statuts, drag & drop)
- [ ] 5.3 Dashboard : relances du jour, pistes/nouveautés, events 7 jours
- [ ] 5.4 Création de candidature **depuis une piste LBB** (lien company + source)

---

## TODO — PHASE 6 — Qualité, sécu, doc

- [ ] 6.1 Validation DTO, Helmet, throttle login, CORS restrictif
- [ ] 6.2 Suppression compte / données CRM (minimisation RGPD)
- [ ] 6.3 E2E : login → explorer → fiche → piste → CRM → historique
- [x] 6.4 README : stack, seed, variables `FT_*`, licence Etalab, ce que Sonar n’est pas

---

## Hors V1 (volontairement)

- Upload de documents / CV
- Hunter / SerpAPI / emails de dirigeants / envoi et relances automatiques (Job2Mail)
- Import SIRENE **France entière** ou tous NAF ; dédup fuzzy qui fusionne tout seul
- Score d’embauche maison (on réaffiche le ciblage LBB, on n’en invente pas un)
- Multi-villes
- API publique Sonar

---

## Ordre de build recommandé

1. Accès INSEE + LBB (jetons) — **en parallèle** du code
2. Monorepo + Prisma 7 + seed techs
3. **SIRENE ciblé** → Explorer + fiche + stats live
4. **LBB overlay** (pistes) + mentions Etalab
5. Toulouse Tech Hub + Radar
6. Auth + CRM
7. Tests / sécu / README
