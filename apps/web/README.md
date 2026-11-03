# Sonar — web

Front Next.js 16 (App Router) de Sonar. L’API Nest est dans `apps/api`. Vue d’ensemble du monorepo : [`README.md`](../../README.md) à la racine.

## Routes

| Chemin | Rôle |
|---|---|
| `/` | Accueil : présentation, trois compteurs (entreprises en direct depuis `GET /companies` avec source INSEE / Sirene et date ; technologies et événements « — », bientôt) et actions (« Explorer l’annuaire », puis « Se connecter » ou « Voir les pistes » selon la session) |
| `/explorer` | Annuaire public des entreprises (Sirene), filtres ville et activité dans l’URL, pagination ; rendu serveur |
| `/login`, `/register` | Compte ; cookie de session posé par l’API (`credentials: 'include'`) |
| `/pistes` | Pistes Toulouse (La Bonne Boîte), métier + page dans l’URL ; 401 → connexion |
| pages d’erreur | adresse inconnue (`not-found`) et plantage (`error`, `global-error`), sans menu |

Une piste n’est **pas** une offre. Le potentiel 0–100 est attribué à La Bonne Boîte. Pied de page commun du layout `(site)` (Sonar n’est pas un service officiel) avec un bloc de sources propre à chaque page (source, date, infos indicatives), fourni via `<FooterSources>`.

**Navigation (en cours).** L’accueil, `/explorer` et `/pistes` vivent dans le groupe de routes `(site)`, dont le layout dessine le lien d’évitement et le menu (logique pure dans `lib/navigation`). `/login`, `/register` et les pages d’erreur restent sans menu. Sous 768 px le menu se replie derrière un bouton « Menu ». Le pied de page est commun (`lib/footer`) ; les liens légaux n’apparaissent que quand leur page existe. **Indice de session.** L’API pose un cookie non HttpOnly `sonar_session_hint=1` (24 h, comme le JWT), effacé au logout. Au montage, `SessionProvider` n’appelle `GET /auth/me` que si l’indice est présent ; sinon le menu passe directement à « Connexion » sans requête. Un 401 (ou une déconnexion) efface l’indice ; une panne réseau ou 5xx le conserve. Ce n’est qu’une optimisation, jamais une preuve d’authentification (logique pure dans `lib/session/hint.ts` et `session.ts`). Reste (issue #22) : session visible (ticket #27).

## Lancer

Depuis la racine du repo (`npm run dev`), ou :

```bash
npm run dev -w web
```

http://localhost:3000 — l’API doit tourner sur le port indiqué par `NEXT_PUBLIC_API_URL` (ex. `http://localhost:3001`). Variables dans `apps/web/.env.local` (copie depuis `.env.example` racine) : Next ne lit pas le `.env` racine, donc `NEXT_PUBLIC_API_URL` et `API_DIRECT_URL` se règlent ici ; redémarrer `npm run dev` après modification. Pour tester le relais en local : `NEXT_PUBLIC_API_URL="/api"` et `API_DIRECT_URL="http://localhost:3001"` (avec `WEB_ORIGIN="http://localhost:3000"` dans le `.env` racine). `NEXT_PUBLIC_API_URL` peut être un chemin relatif (`/api`) : avec `API_DIRECT_URL` (serveur uniquement, vide en local), Next relaie `/api/*` vers l’API (une seule origine, cookie first-party). **Aucun** `FT_*` / `INSEE_*` ici.

## Scripts

```bash
npm run lint -w web
npm run typecheck -w web
npm run test -w web
npm run build -w web
```
