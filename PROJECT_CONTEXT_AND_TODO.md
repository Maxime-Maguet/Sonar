# Sonar — Contexte produit et TODO

**Décision :** La Bonne Boîte fait partie de la **V1**. Ce n’est pas un bonus V2.  
Le planning 10 jours peut dépasser : on privilégie les pistes de candidature spontanée.

**Échelle :** Explorer + Pistes LBB + agenda + CRM perso. Pas un deuxième produit. Une seule liste ci-dessous, **dans l’ordre**. On ne stocke plus le socle Nest (DTO, env, erreurs) dans une « phase 6 qualité » à la fin.

Hors V1 (produit **et** socle) : upload, Hunter / mails auto, SIRENE France entière, score calculé par Sonar, multi-villes, API publique, circuit breaker, refresh tokens, versioning `/v1`, soft-delete annuaire, K8s. Le potentiel d’embauche **France Travail** (0–100), lui, est en V1.

---

## Décisions figées (ne plus rediscuter)

- **Produit :** centraliser les entreprises tech de Toulouse, et parmi elles celles qui peuvent embaucher. Agenda + CRM perso en plus. Pas un job board.
- **Deux couches données (cœur V1) :**
  1. **SIRENE ciblé** (sièges employeurs actifs, Toulouse + 1re couronne + quelques codes NAF tech) = **l’annuaire**. Le NAF et le caractère employeur servent à découvrir des entreprises, pas à dire « elles recrutent ».
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
- **Session V1 :** un JWT HS256 dans le cookie `sonar_session` (HttpOnly, SameSite=Lax, Path=/, Secure en prod), durée 24 h, champ `ver` = `User.sessionVersion`. Incrémenter `sessionVersion` révoque tous les tickets. Réémission glissante si le JWT a déjà vécu plus de 12 h. Refresh token = V2. Logout efface toujours le cookie et n'incrémente `sessionVersion` que si le JWT est encore valide et `ver` correspond ; email stocké en trim+lowercase ; échec de login = une seule 401 ; `cookie-parser` remplit `request.cookies`. **Indice de session :** en plus du JWT, l'API pose `sonar_session_hint=1` (non HttpOnly, SameSite=Lax, Path=/, Secure en prod, 24 h, host-only) à chaque émission du JWT (register, login, réémission glissante) et l'efface partout où elle efface `sonar_session` (logout, purge d'une session révoquée). Le site ne lit `GET /auth/me` que si l'indice est présent (visiteur anonyme : aucun appel). L'indice n'autorise jamais rien : seul le JWT HttpOnly compte ; un indice périmé ou forgé coûte au pire un `/auth/me` en 401, qui l'efface côté navigateur. Migration : une session ouverte avant ce changement n'a pas d'indice, le menu affiche « Connexion » jusqu'à la prochaine connexion. DTO, throttle login et CORS `WEB_ORIGIN` sont en place.
- **CSRF V1 :** sur POST / PUT / PATCH / DELETE, `Origin` doit être strictement présente dans la liste `WEB_ORIGIN` (origines séparées par des virgules, parseur partagé `config/web-origins.ts`). Pas de double-submit (cookie API illisible depuis le front). Pas de mutation sur GET.
- **Navigation et UX (carte #17, spec #22) :** menu et pied de page dessinés une fois dans le cadre `(site)` (hors `/login`, `/register` et pages d'erreur). Menu : marque « Sonar » (lien vers l'accueil), Explorer, Pistes, puis Événements, Radar, CRM en texte grisé « bientôt ». Repli en bouton « Menu » sous 768 px. Thème clair/sombre dans le menu. Session lue dans le navigateur (`GET /auth/me`) : email + « Déconnexion » une fois connecté, `next` = page courante sur chaque lien de connexion, déconnexion vers l'accueil. Pied de page commun (« pas un service officiel », liens légaux quand les pages existent) + bloc de sources par page. Accueil : présentation du produit (le futur décrit comme prévu), 3 compteurs (« — » sans donnée, jamais « 0 »), action « Explorer l'annuaire ». Page de couleurs supprimée.

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
- [x] Couper `POST /sirene/:siret/create` public (session + rôle `ADMIN` en base, relu à chaque appel ; `GET /sirene/:siret` exige une session, sans rôle admin)

### C — Contrats HTTP

Dès qu’un endpoint est créé (ci-dessous) : DTO entrée, DTO **sortie** (jamais Prisma brut), pipe, pagination bornée. Pas un chantier séparé.

- [x] Sirene : pipe SIRET 14 chiffres + DTO de sortie (la GET de test peut rester)

### D — Providers API (annuaire + pistes)

**Sirene** — Sirene est complétée et terminée (`src/sirene`)

- [x] `prisma migrate deploy` + apply Docker/CI
- [x] Communes Toulouse + 1re couronne + NAF découverte **en config** (ex. 62.01Z, 62.02A, 58.29C, 62.09Z en NAF Rev2 ; liste ajustable, pas toute la France). Requête `q` : sièges, établissements actifs et **employeurs** (`caractereEmployeurEtablissement:O`), champs historisés dans `periode(...)` (~1070 résultats, sous le plafond de 5000). Employeur ≠ recrute. NAF25 non interrogeable via `q` (INSEE 400) : filtré côté client.
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

- [x] `GET /health` : ping **BDD** = process. SIRENE/LBB = deps pour le front (`unchecked`, pas de sonde). Un provider down **ne tue pas** l’API.

### F — Front (le site)

Socle UI

- [x] Client HTTP unique, `credentials: 'include'`, **aucun** secret INSEE/FT en `NEXT_PUBLIC_*` (pages `/login` `/register` ; 401 géré par la page, pas le client)
- [x] `error.tsx` / `not-found.tsx` (+ `global-error.tsx`, phrases d'échec connexion / inscription)
- [ ] `loading.tsx` / skeletons sur les listes (squelette **Pistes** déjà en place)
- [x] Header / Hero / Footer produit (badge Toulouse, nav : Explorer, Événements, Radar, Pistes, CRM). **Décisions prises** (carte #17, tickets de décision #18 à #21 fermés) et **spec #22** écrite. Implémenté, dans l'ordre : [x] #23 cadre `(site)` + menu ordinateur → [x] #25 menu replié téléphone → [x] #27 session visible (email + Déconnexion) → [x] #28 nouvel accueil (présentation, compteurs, actions) ; en parallèle : [x] #26 pied de page commun et [x] #24 marque « Sonar » sur `/login` et `/register`. État actuel : cadre `(site)` et menu ordinateur (#23), menu replié sous 768 px (#25), pied de page commun avec bloc de sources par page (#26), session lue dans le navigateur (`GET /auth/me`) : « Connexion » vers `/login?next=<page courante>` ou email + « Déconnexion » (#27). Reste le tour d'ensemble UX par le propriétaire
- [ ] Pages légales : mentions, confidentialité (compte + CRM + `"P"` + cookie de session). Pas encore de ticket (contenu à fournir : identité de l'éditeur). Le pied de page (#26) et les écrans `/login` `/register` n'affichent un lien que quand sa page existe. Adresses prévues : `/mentions-legales`, `/confidentialite`
- [ ] Déploiement (voir bloc H) : décisions prises dans #29 (fermé). La session visible reste lue dans le navigateur (`GET /auth/me`) et ne dépend pas de ce bloc

Explorer & fiches

- [ ] **Stats hero en live** (count companies, techs distinctes, events du mois) — jamais de « 120+ » en dur. Prévu dans le ticket #28 (nouvel accueil) : compteur entreprises en direct avec source et date ; technologies et événements affichent « — » tant que rien ne les alimente
- [x] `GET /companies` + page `/explorer` (#12, #13, #14) : annuaire public, filtres URL ville + activité, pagination (20 par page), DTO, throttle 60 req/min, sources et date de synchro en pied de page. Les filtres `tech` (cumulatif AND) et `type` restent à faire (aucune technologie n'est enregistrée, le type n'est pas rempli)
- [x] Cartes entreprise (nom, commune, activité ; sans SIREN, SIRET ni adresse). Une carte ne mène nulle part tant que la fiche n'existe pas
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

### H — Déploiement (Vercel)

Décisions : #29 (fermé). Spec : #30. Tickets : [x] #31 adresses de base poolée / directe, [x] #32 `trust proxy`, [x] #33 une seule origine côté site (ces trois sont indépendants) → [x] #34 guide de déploiement ([`docs/DEPLOIEMENT_VERCEL.md`](docs/DEPLOIEMENT_VERCEL.md)) → [ ] #35 déploiement de test et vérifications (étapes humaines, sans label d'agent). Site Next.js et API NestJS = deux projets Vercel (plan Hobby), base **Prisma Postgres** (intégration Vercel, région européenne), pas de domaine propre. Limite connue : les limites de débit sont en mémoire, non partagées entre instances (hors périmètre de #30). #36 : `@nestjs/throttler` (CommonJS, `ERR_REQUIRE_ESM` sur Vercel) remplacé par un module du dépôt, `apps/api/src/throttler/` (ES module, mêmes limites et mêmes noms).

- [x] **Une seule origine** (#33) : le site relaie l'API par réécriture (`rewrites` Next vers l'API, activée par `API_DIRECT_URL` ; `lib/api/base-url.ts`). Le cookie `sonar_session` reste first-party, `SameSite=Lax`. Raison : deux projets en `*.vercel.app` sont deux sites distincts, le cookie ne passerait pas. `NEXT_PUBLIC_API_URL` et `WEB_ORIGIN` = adresse du site ; variable serveur distincte pour l'annuaire public rendu côté serveur
- [x] `trust proxy` côté API : sans lui, les limites par IP (login 5/min, annuaire 60/min) comptent l'adresse du relais. **Mesuré le 6 nov. 2026 : `TRUST_PROXY_HOPS=1`** (limite à 5 puis `429` ; une fausse adresse dans `X-Forwarded-For` ne contourne pas la limite ; le téléphone n'est pas bloqué quand le PC l'est)
- [x] Deux adresses de base (#31) : l'application lit `DATABASE_URL_POOLED` (repli `DATABASE_URL`) ; les migrations (`prisma migrate deploy`) gardent l'adresse directe `DATABASE_URL`. Docker local et CI alignés sur PostgreSQL 17 (Prisma Postgres) ; un volume local créé en 16 doit être recréé (dump puis restore). Vérifié en local : 411 tests API, `GET /health`
- [ ] Prévisualisations Vercel : connexion sur l'adresse stable seulement (`WEB_ORIGIN` = une seule origine, CSRF strict)
- [x] Synchronisation Sirene : `POST /sirene/sync` (admin) sur l'API déployée. **Chronométrée le 6 nov. 2026 : `200` en 5 s, 1 015 établissements** (fonction à Paris) ; le repli depuis le poste local n'est pas nécessaire. Le rôle `ADMIN` se pose en base à la main (fait, via Prisma Studio)
- [x] Vérifier sur un déploiement de test : fait le 6 nov. 2026 : connexion, `Set-Cookie` des deux cookies à travers la réécriture (`Secure`, `SameSite=Lax`, `HttpOnly` sur la session), `GET /leads` envoie le cookie et répond 200, limite par IP comptée par visiteur, `GET /health` en `200`, durée de la synchro. Vérifié à la main le 9 nov. 2026 : déconnexion (les deux cookies supprimés) et `GET /auth/me` (requête authentifiée avec les deux cookies, réponse `304` après revalidation du cache ; aucun appel pour un anonyme)
- [x] Démarrage de NestJS en fonction Vercel : trois causes corrigées (typage de `helmet` ; `@nestjs/throttler` en CommonJS → #36 ; surtout le `await bootstrap()` de plus haut niveau, qui bloquait 60 s sans log). Fonctions à Paris via `apps/api/vercel.json`. Détail dans `docs/DEPLOIEMENT_VERCEL.md`, section 8
- [ ] À surveiller : définition d'une « opération » et pause éventuelle de l'offre gratuite Prisma Postgres (quota affiché à 100 000 opérations par mois dans l'interface Vercel ; relever la consommation après la première synchro). Noms des variables d'adresse de base confirmés (`DATABASE_URL`, `DATABASE_URL_POOLED`)
- [ ] Inscriptions ouvertes à tous en production ? (à trancher)
- [ ] Constats de sécurité connus, **sans ticket volontairement** (projet perso, pas public ; à rouvrir si le site s'ouvre) : (1) `POST /auth/register` n'a **aucune limitation de débit** (déjà le cas avant #36, `login` en a une) ; (2) si `TRUST_PROXY_HOPS` est absente ou trop basse en production, tous les visiteurs partagent un seul compteur et un seul attaquant peut bloquer tous les logins (valeur actuelle `1`, mesurée) ; (3) le stockage de la limitation n'a pas de plafond de clés et reste par instance (déjà noté plus haut) ; (4) `@nestjs/throttler` reste CommonJS : si une version compatible NestJS 12 sort, le module `apps/api/src/throttler/` (670 lignes) pourra être remplacé par le paquet officiel

### Agenda API (après LBB, avant ou après le Kanban)

- [ ] Adapter Toulouse Tech Hub (ICS/JSON), idempotence `(source, externalId)`
- [ ] Cron quotidien (ex. 04:00 Europe/Paris), un run à la fois

---

**Où on en est (6 nov. 2026).** Dernier ajout hors ticket : indice de session (`sonar_session_hint`), `GET /auth/me` n'est plus appelé pour un visiteur anonyme ; à vérifier à la main dans le navigateur (dev direct et relayé, puis déploiement de test : `Set-Cookie` des deux cookies à travers la réécriture). Fait : pages d'erreur (#9, #10), phrases d'échec connexion / inscription (#11), annuaire public `/explorer` et `GET /companies` (#12 à #14), corrections Sirene (#15, #16). Navigation et UX : carte #17, décisions #18 à #21 fermées, spec #22 publiée, tickets d'implémentation #23 à #28 tous faits (cadre et menu, marque sur connexion / inscription, menu replié téléphone, pied de page commun, session visible, nouvel accueil). Reste le tour d'ensemble UX par le propriétaire (plusieurs défauts d'UX connus, à reprendre en détail).

Déploiement : décisions #29 (fermé), spec #30, tickets #31 à #36 (bloc H). #31 (adresses de base poolée / directe, Postgres 17) et #32 (`TRUST_PROXY_HOPS`) et #33 (une seule origine : réécriture `/api`, `API_DIRECT_URL`) faits ; #34 (guide [`docs/DEPLOIEMENT_VERCEL.md`](docs/DEPLOIEMENT_VERCEL.md)) fait le 6 nov. 2026 ; #36 (limitation de débit en ES module, module `apps/api/src/throttler/`) fait le 6 nov. 2026, `GET /health` = `200` sur Vercel vérifié ; #35 (déploiement de test) : **déployé et vérifié le 6 nov. 2026** (site `sonar-web-inky.vercel.app`, API `sonar-rho-beryl.vercel.app`, base Prisma Postgres à Paris, 6 migrations appliquées, compte `ADMIN`, annuaire synchronisé : 1 015 établissements) ; déconnexion et `GET /auth/me` vérifiées à la main le 9 nov. 2026, #35 fermé. Point à surveiller : `GET /auth/me` répond avec `cache-control: public, max-age=0, must-revalidate` (pas de mise en cache Vercel observée, `x-vercel-cache: MISS`) ; `no-store` possible si on veut être strict.

**Prochaine étape :** tickets du tour d'ensemble UX (9 nov. 2026), un par session. Faits : #37 (direction visuelle) et #45 (en-tête fixe à flou, 3 zones, bascule menu replié à lg 1024 px, largeur du contenu alignée sur l'en-tête). Restent #46 (cartes) et #47 (accueil). Indépendants : #38 (lien Sirene), #39 (curseur pointeur), #40 (marque connexion / inscription), #41 (messages de validation), #42 (toast de déconnexion), #43 (pagination), #44 (pied de page centré). (#35, #30, #22 et #17 sont fermés.) Hors de cette file : skeletons et `loading.tsx`, pages légales, fiche `/explorer/[slug]`, filtre par technologie. Ne pas rouvrir Sirene, `GET /leads`, ni Health sauf bug. CRM et agenda restent plus bas dans la file.
