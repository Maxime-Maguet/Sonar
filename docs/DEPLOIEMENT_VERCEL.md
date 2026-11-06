# Déploiement de Sonar sur Vercel

Guide du ticket #34 (spec #30, décisions #29). Il sert à déployer Sonar sur Vercel puis à vérifier que ça marche (ticket #35, étapes faites par le propriétaire). Aucune valeur secrète n'apparaît ici : les valeurs se saisissent dans le tableau de bord Vercel.

## 1. Vue d'ensemble

Trois éléments, dans cet ordre de création :

1. **La base** : Prisma Postgres, ajoutée par l'intégration Vercel, **région européenne**.
2. **Le projet API** : NestJS (`apps/api`), un projet Vercel, plan Hobby.
3. **Le projet site** : Next.js (`apps/web`), un projet Vercel, plan Hobby.

Pas de domaine propre : chaque projet a une adresse `*.vercel.app`.

**Une seule origine.** Le navigateur ne parle qu'à l'adresse du site. Le site relaie `/api/*` vers l'API (réécriture Next). Raison : `vercel.app` est un suffixe public, donc deux projets sont deux sites distincts pour le navigateur, et le cookie de session `sonar_session` (`SameSite=Lax`, sans `Domain`) ne partirait pas du site vers l'API. Avec le relais, le cookie reste first-party.

Les deux projets pointent sur le même dépôt, avec un **Root Directory** différent (`apps/api` et `apps/web`). Le dépôt est un monorepo npm workspaces : activer l'option permettant d'accéder aux fichiers hors du Root Directory (le paquet `packages/api-contract` est compilé par `prepare`).

> À vérifier au premier déploiement : le démarrage de NestJS comme fonction Vercel (support « zéro configuration »). Un premier essai a échoué (`ERR_REQUIRE_ESM`) à cause de `@nestjs/throttler`, seul paquet NestJS en CommonJS : il est remplacé par un module du dépôt en ES module (`apps/api/src/throttler/`, ticket #36, mêmes limites et mêmes noms). Reste à confirmer que `GET /health` répond `200` sur le déploiement de test (étape du propriétaire, pas encore faite). Si une autre erreur de démarrage apparaît, on l'adapte au minimum nécessaire, dans un ticket séparé.

## 2. Variables par projet

**Règle : les secrets n'existent que sur le projet API.** Le site ne reçoit jamais `FT_*`, `INSEE_API_KEY`, `JWT_SECRET` ni une adresse de base.

### Projet API (`apps/api`)

| Variable | Secret ? | Contenu |
|---|---|---|
| `NODE_ENV` | non | `production` (obligatoire, sensible à la casse). Active le cookie `secure` et le garde sur `WEB_ORIGIN` |
| `WEB_ORIGIN` | non | **Uniquement l'adresse stable du site** (ex. `https://<projet-site>.vercel.app`). Pas de localhost ni d'IP privée en production, pas de joker |
| `TRUST_PROXY_HOPS` | non | Nombre de proxies devant l'API (entier ≥ 0). Valeur de départ à tester : `1` ou `2`, à mesurer (voir 5.4). Une valeur invalide empêche l'API de démarrer |
| `DATABASE_URL` | **oui** | Adresse **directe** de Prisma Postgres. Utilisée par `prisma migrate deploy`, et par l'application si `DATABASE_URL_POOLED` est absente |
| `DATABASE_URL_POOLED` | **oui** | Adresse **poolée** de Prisma Postgres. Lue par l'application au runtime |
| `JWT_SECRET` | **oui** | Longue chaîne aléatoire, propre à la production (ne pas réutiliser celle du local) |
| `FT_CLIENT_ID` | **oui** | Identifiant OAuth France Travail (voir `docs/LBB_API.md`) |
| `FT_CLIENT_SECRET` | **oui** | Secret OAuth France Travail |
| `INSEE_API_KEY` | **oui** | Clé API Sirene |
| `API_PORT` | non | Inutile sur Vercel (défaut `3001`) |

D'où viennent les adresses de la base : l'intégration Prisma Postgres de Vercel crée elle-même les variables de connexion dans le projet auquel on la relie. Selon la spec, l'adresse directe arrive sous `DATABASE_URL` et l'adresse poolée sous une seconde variable. **Point non vérifié (contrôle côté Vercel en attente) :** le nom exact de cette seconde variable ; le dépôt ne permet pas de le confirmer (il ne fait que lire `DATABASE_URL_POOLED`). Après l'intégration, ouvrir *Settings → Environment Variables* du projet API et comparer. Si le nom diffère de `DATABASE_URL_POOLED`, créer `DATABASE_URL_POOLED` à la main avec la valeur de l'adresse poolée. L'API valide les deux (préfixe `postgres://` ou `postgresql://`) et refuse de démarrer sinon.

### Projet site (`apps/web`)

| Variable | Secret ? | Contenu |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | non (publique) | `/api` : le préfixe du relais, chemin relatif, même origine que le site |
| `API_DIRECT_URL` | non, mais **serveur uniquement** | Adresse réelle de l'API (ex. `https://<projet-api>.vercel.app`), sans slash final. Sert à la réécriture `/api/*` et à l'appel serveur de l'annuaire. Ne jamais la préfixer par `NEXT_PUBLIC_` |

Rien d'autre. Si `API_DIRECT_URL` est absente, aucune règle de relais n'est créée et `/api` ne mène nulle part.

## 3. Créer la base et appliquer les migrations

1. Dans Vercel : *Storage* → ajouter **Prisma Postgres** → région **européenne** → relier au projet **API**.
2. Récupérer l'adresse **directe** (sans lire les valeurs à voix haute ni les coller dans un fichier du dépôt).
3. Appliquer les migrations existantes sur la base de production, **depuis ton poste**, avec l'adresse directe. L'API ne migre jamais au démarrage.

   Dans PowerShell, en une seule session, sans écrire l'adresse dans `.env` :

   ```powershell
   $env:DATABASE_URL = "<adresse directe de production>"
   npm run prisma:migrate:deploy -w api
   Remove-Item Env:DATABASE_URL
   ```

   Pourquoi c'est sûr : `prisma.config.ts` charge le `.env` racine, mais une variable d'environnement déjà posée dans la session a priorité sur ce fichier. **À vérifier avant de lancer :** que la commande affiche bien le nom de la base de production, pas `localhost:5433`.

   Ne jamais utiliser `prisma migrate dev` ni `migrate reset` contre la production : ils peuvent supprimer des données.
4. Contrôler : la liste des tables apparaît dans l'interface de la base (Prisma Postgres / Studio).

## 4. Donner le rôle ADMIN à ton compte

La synchronisation Sirene demande une session `ADMIN`. Le rôle se pose en base à la main, une fois :

1. Sur le site déployé, **crée ton compte** via la page d'inscription (voir « Inscriptions » dans les points ouverts, section 7).
2. Ouvre la base de production dans l'interface Prisma Postgres (éditeur SQL) ou avec Prisma Studio branché sur l'adresse directe.
3. Exécute, en remplaçant l'adresse par la tienne (en minuscules, c'est ainsi qu'elle est stockée) :

   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'ton.adresse@exemple.fr';
   ```
4. Vérifie qu'**une seule ligne** est modifiée.
5. Déconnecte-toi puis reconnecte-toi sur le site.

## 5. Liste de contrôle du déploiement de test

À faire sur l'**adresse stable** du site, jamais sur une prévisualisation.

### 5.1 Démarrage et santé
- [ ] `GET <adresse API>/health` répond `200` avec `status: ok` (Postgres joignable).
- [ ] L'API démarre comme fonction Vercel : pas d'erreur de démarrage dans les journaux. Sinon, noter l'erreur et ouvrir un ticket.
- [ ] La page d'accueil du site s'affiche, et `/explorer` charge l'annuaire (appel serveur via `API_DIRECT_URL`, sans cookie).

### 5.2 Connexion et cookie à travers le relais
Dans le navigateur, ouvrir les outils de développement (onglet Réseau, puis Application → Cookies).
- [ ] La connexion réussit. La réponse de `POST /api/auth/login` contient `Set-Cookie`.
- [ ] Le cookie `sonar_session` est stocké **pour l'hôte du site** (et non pour l'hôte de l'API), avec `HttpOnly`, `Secure` et `SameSite=Lax`.
- [ ] Le cookie `sonar_session_hint` (indice de session) est lui aussi posé : les deux `Set-Cookie` traversent bien la réécriture.
- [ ] `GET /api/auth/me` répond `200` une fois connecté ; pour un visiteur anonyme, **aucun** appel `/auth/me` n'est fait.
- [ ] Depuis la page Pistes, la requête `GET /api/leads?...` envoie le cookie de session et répond `200`.
- [ ] La déconnexion fonctionne (le garde CSRF accepte la requête) et les deux cookies sont supprimés.

### 5.3 Origine vue par l'API (CSRF)
- [ ] Une mutation faite depuis le site (connexion, déconnexion, inscription) est acceptée : l'en-tête `Origin` reçu par l'API est bien l'origine du site, donc présent dans `WEB_ORIGIN`.
- [ ] Un refus `403` sur une mutation signifie presque toujours que `WEB_ORIGIN` ne correspond pas exactement à l'adresse du site (schéma `https://` et absence de slash final compris).

### 5.4 Limites par IP et nombre de proxies
But : que les limites (connexion 5 par minute, annuaire 60 par minute) comptent **chaque visiteur**, pas le relais.
1. Régler `TRUST_PROXY_HOPS` sur une valeur de départ (`1`), redéployer l'API.
2. Depuis ton poste, faire 6 tentatives de connexion ratées d'affilée à travers le site (`/api/auth/login`). La 6e doit répondre `429`.
3. Depuis un **autre réseau** (partage de connexion du téléphone), tenter une connexion : elle ne doit **pas** répondre `429`. Si elle répond `429`, tous les visiteurs sont comptés ensemble : la valeur est trop basse.
4. Si, au contraire, une adresse falsifiée dans l'en-tête `X-Forwarded-For` envoyé par le client permet de contourner la limite, la valeur est trop haute.
5. Ajuster (`1`, puis `2`), redéployer, refaire le test, et **noter la valeur retenue** dans `PROJECT_CONTEXT_AND_TODO.md`.

Rappel : les compteurs sont en mémoire et propres à chaque instance de fonction. Le comptage est donc approximatif sur Vercel (voir section 7).

### 5.5 Chronométrer la synchronisation Sirene
À faire **avant** de la lancer pour de bon, une fois l'`ADMIN` en place :
1. Se connecter sur le site, récupérer le cookie de session dans les outils de développement (valeur à ne pas partager ni commiter).
2. Lancer la synchronisation en mesurant le temps (PowerShell) :

   ```powershell
   $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
   $s.Cookies.Add((New-Object System.Net.Cookie("sonar_session", "<valeur du cookie>", "/", "<hôte du site>")))
   Measure-Command {
     Invoke-WebRequest -Method Post -Uri "https://<adresse du site>/api/sirene/sync" `
       -Headers @{ Origin = "https://<adresse du site>" } -WebSession $s
   }
   ```
3. Comparer la durée à la **limite de durée d'une fonction** du plan Hobby, **à lire dans le tableau de bord Vercel** (les sources divergent, voir section 7).
   - Durée très inférieure à la limite (marge large) : la synchronisation reste un appel à `POST /sirene/sync` sur l'API déployée.
   - Sinon : utiliser le repli de la section 6.
4. Noter la durée mesurée dans `PROJECT_CONTEXT_AND_TODO.md`.

La route est limitée à 2 appels par minute et par instance.

## 6. Repli : lancer la synchronisation depuis ton poste

Si la synchronisation ne tient pas avec une large marge sous la limite de durée, on la lance depuis une API **locale** branchée sur la base de **production** :

1. Dans une session PowerShell, poser **seulement pour cette session** : `DATABASE_URL` (adresse directe de production), puis les variables de l'API habituelles (`JWT_SECRET`, `INSEE_API_KEY`, `FT_*`, `NODE_ENV=development`, `WEB_ORIGIN=http://localhost:3000`). Ne pas modifier le `.env` du dépôt.
2. Vérifier que les variables posées prennent bien le pas sur `.env` et que `DATABASE_URL` désigne la production : **une erreur ici ferait écrire l'annuaire dans la mauvaise base**.
3. Démarrer l'API locale (`npm run dev:api`), se connecter avec ton compte `ADMIN` **de production** (présent dans cette base), puis appeler `POST http://localhost:3001/sirene/sync` avec le cookie de session et l'en-tête `Origin: http://localhost:3000`.
4. Fermer la session PowerShell pour effacer les variables.

Attention : cette API locale écrit dans la base de production. Pour essayer la synchronisation sans toucher aux données de production, utiliser une **base de test séparée** (histoire 32 de la spec) plutôt que la base de production.

## 7. Prévisualisations, limites connues, points non vérifiés

**Prévisualisations.** Chaque branche crée une adresse temporaire. Seule l'adresse stable est dans `WEB_ORIGIN`, donc **la connexion ne marche que sur l'adresse stable** ; les prévisualisations montrent les pages publiques (accueil, `/explorer`). On n'ajoute ni joker ni motif dans `WEB_ORIGIN` : le garde CSRF reste strict.

**Limites connues**
- Les limites de débit sont **en mémoire et non partagées** entre instances de fonction : la protection contre les tentatives de connexion répétées est approximative. Un stockage partagé pourra faire l'objet d'un ticket si le site devient public.
- La durée maximale d'une fonction sur Hobby borne la synchronisation Sirene.
- Pas de pipeline de déploiement automatique, pas de tâche planifiée, pas de supervision ni de sauvegardes au-delà de ce que fournit Prisma Postgres.

**Points non vérifiés** (à ne pas tenir pour acquis)
- La durée maximale d'une fonction sur Hobby (les sources divergent : lire le tableau de bord).
- Ce qui compte comme une « opération » pour le quota gratuit de Prisma Postgres (la spec disait 200 000 par mois ; l'interface Vercel affiche 100 000 opérations par mois : c'est ce chiffre qui fait foi, à relire dans le tableau de bord), et une éventuelle mise en pause après inactivité (au premier appel suivant, la base peut mettre du temps à répondre).
- Le comportement de `Set-Cookie` et de `Origin` à travers le relais : c'est le but des contrôles 5.2 et 5.3.
- Le démarrage de NestJS comme fonction Vercel : cause d'échec connue corrigée (#36, limitation de débit en ES module), `GET /health` en `200` encore à vérifier sur le déploiement de test.
- Le nombre de proxies devant l'API (`TRUST_PROXY_HOPS`) : à mesurer, section 5.4.
- Le nom exact de la variable d'adresse poolée créée par l'intégration (section 2).

**Inscriptions.** Faut-il garder l'inscription ouverte à tout le monde en production ? Décision pas encore prise (voir `PROJECT_CONTEXT_AND_TODO.md`, bloc H). En attendant, ton compte se crée par la page d'inscription.

## 8. Rappels de gouvernance des données

Toute donnée Sirene ou La Bonne Boîte affichée cite sa source et sa date de mise à jour. Aucun secret (`FT_*`, `INSEE_API_KEY`) ne va dans le site. Voir `CLAUDE.md` à la racine.
