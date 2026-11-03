# Sonar — web

Front Next.js 16 (App Router) de Sonar. L’API Nest est dans `apps/api`. Vue d’ensemble du monorepo : [`README.md`](../../README.md) à la racine.

## Routes

| Chemin | Rôle |
|---|---|
| `/` | Accueil : aujourd’hui une page de démonstration des couleurs, sans lien ; remplacée par le ticket #28 |
| `/explorer` | Annuaire public des entreprises (Sirene), filtres ville et activité dans l’URL, pagination ; rendu serveur |
| `/login`, `/register` | Compte ; cookie de session posé par l’API (`credentials: 'include'`) |
| `/pistes` | Pistes Toulouse (La Bonne Boîte), métier + page dans l’URL ; 401 → connexion |
| pages d’erreur | adresse inconnue (`not-found`) et plantage (`error`, `global-error`), sans menu |

Une piste n’est **pas** une offre. Le potentiel 0–100 est attribué à La Bonne Boîte. Pied de page Etalab propre à chaque page (source, date, infos indicatives, Sonar n’est pas un service officiel).

**Navigation (en cours).** L’accueil, `/explorer` et `/pistes` vivent dans le groupe de routes `(site)`, dont le layout dessine le lien d’évitement et le menu (logique pure dans `lib/navigation`). `/login`, `/register` et les pages d’erreur restent sans menu. Reste (issue #22) : menu téléphone, session visible, pied de page commun, nouvel accueil (tickets #25 à #28).

## Lancer

Depuis la racine du repo (`npm run dev`), ou :

```bash
npm run dev -w web
```

http://localhost:3000 — l’API doit tourner sur le port indiqué par `NEXT_PUBLIC_API_URL` (ex. `http://localhost:3001`). Variable dans `.env.local` (copie depuis `.env.example` racine). **Aucun** `FT_*` / `INSEE_*` ici.

## Scripts

```bash
npm run lint -w web
npm run typecheck -w web
npm run test -w web
npm run build -w web
```
