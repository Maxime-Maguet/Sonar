# La Bonne Boîte v2 — intégration backend (NestJS)

Référence pour le module `src/la-bonne-boite/` (Phase 4). Validé en Postman (sept. 2026).

Catalogue officiel : [La Bonne Boîte v2](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2/documentation).

---

## Secrets (`.env` racine, jamais Git)

| Variable | Rôle |
|----------|------|
| `FT_CLIENT_ID` | Identifiant client (`PAR_…`) |
| `FT_CLIENT_SECRET` | Clé secrète de l’application |

Uniquement côté **API NestJS**. Jamais le front Next.js.

---

## OAuth2 — client credentials

| Constante | Valeur |
|-----------|--------|
| **Token URL** | `https://authentification-partenaire.francetravail.io/connexion/oauth2/access_token?realm=/partenaire` |
| **Grant** | `client_credentials` |
| **Scope (obligatoire, doc Swagger LBB v2)** | `search office api_labonneboitev2` (séparés par des espaces, un seul champ `scope`) |

Body `application/x-www-form-urlencoded` :

- `grant_type=client_credentials`
- `client_id` / `client_secret` depuis `.env`
- `scope=search office api_labonneboitev2`

Réponse typique : `access_token`, `token_type` (`Bearer`), `expires_in` (~1500 s). Pas de refresh token : redemander un jeton avant expiration (marge ~60 s côté code).

**Ne pas utiliser** pour LBB v2 :

- URL token legacy `https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire` seule (peut émettre un jeton incomplet pour la passerelle LBB).
- Scope réduit à `api_labonneboitev2` seul → **403 Invalid scope** sur les routes métier.

---

## API métier (OpenAPI 3.1, LBB **v2.27.3**)

Source : [Stoplight LBB v2](https://francetravail.io/produits-partages/catalogue/bonne-boite-v2/documentation) (lu le 12 oct. 2026).

| Constante | Valeur |
|-----------|--------|
| **Base URL** | `https://api.francetravail.io/partenaire/labonneboite/v2` |
| **Auth header** | `Authorization: Bearer <access_token>` |
| **Accept** | `application/json` |

Trois routes. **Pas** `/company/` v1, **pas** `rome_codes`.

| Méthode | Path | Rôle Sonar V1 |
|---------|------|----------------|
| GET | `/recherche` | **Liste des pistes** (contrat du provider) |
| GET | `/nombreEntreprise` | Sanity check Postman uniquement |
| GET | `/potentielEmbauche` | Fiche par SIRET — hors overlay liste |

`rome` et `citycode` sont des **tableaux** OpenAPI (répéter le query string si plusieurs valeurs). Un seul `rome=M1805` suffit pour V1.

---

### Liste — `GET /recherche`

« Entreprises à fort potentiel d’embauche, **ordre de score décroissant**. »

Query utiles V1 (le reste du Swagger existe, on ne l’expose pas) :

| Param | V1 | Notes OpenAPI |
|-------|----|----------------|
| `rome` | **envoyé** | Code ROME, ex. `M1805`. Optionnel côté FT ; **obligatoire** côté Sonar. |
| `citycode` | **envoyé** | Code INSEE, Toulouse = `31555`. Combinable avec `distance`. |
| `distance` | **envoyé** | km, intervalle ouvert `]0, 200[`. Avec `citycode` = rayon autour de la mairie. Postman historique : `10`. |
| `page` | **envoyé** | Entier, **à partir de 1**, défaut FT `1`. |
| `page_size` | **envoyé explicitement** | Max FT **100**. Texte Swagger : défaut 20 ; schema : défaut 10. **Ne pas compter sur le défaut** — Sonar envoie la valeur (ticket 4 : borné, ex. max 20). |

Pas de `page` / `page_size` dans le JSON de réponse : le total est `hits`.

Réponse 200 `SearchResponse` :

```json
{
  "hits": 151,
  "items": [ { "siret": "…", "company_name": "…" } ],
  "params": {},
  "resolved_params": {}
}
```

Champs `SearchResponseItem` **à parser** (les autres existent, on ne s’en sert pas pour l’overlay) :

| Champ | Usage overlay |
|-------|----------------|
| `siret` | Clé établissement (14 chiffres). **Obligatoire pour upsert.** Peut être `null` → skip. |
| `company_name` | Nom fiche minimale si SIRET inconnu de SIRENE. |
| `citycode` | Filtre Toulouse + couronne. |
| `city` | Ville affichage / create minimale. |
| `rome` | Métier de la piste (`externalId` = `` `${siret}:${rome}` ``). |
| `naf` | Optionnel, pas un signal de recrutement. |
| `office_name` | Enseigne éventuelle ; ne pas fusionner au nom SIRENE. |
| `postcode` | Optionnel. |
| `hiring_potential` | **Ne pas exposer** dans le DTO HTTP (score LBB, pas un score maison Sonar). |

Exemple item officiel (Metz, schema Stoplight) : [`search.fixture.ts`](../apps/api/src/la-bonne-boite/helpers/search.fixture.ts). Ce n’est **pas** un dump Toulouse ; la forme des champs est le contrat.

Appel V1 typique :

```http
GET /recherche?rome=M1805&citycode=31555&distance=10&page=1&page_size=10
Authorization: Bearer <access_token>
Accept: application/json
```

---

### Nombre — `GET /nombreEntreprise` (sanity check)

```http
GET /nombreEntreprise?rome=M1805&citycode=31555&distance=10
```

Réponse 200 `SearchCountResponse` : `{ "hits": number, "params": {...}, "resolved_params": {...} }` — **pas** de `items`.

Test de référence validé (sept. 2026) : ces params → `hits` > 0.

---

### SIRET — `GET /potentielEmbauche`

Query **`siret`** (tableau, **required**). Hors ticket overlay liste ; utile plus tard pour une fiche unitaire.

---

## Implémentation Nest (rappels Phase 4)

1. Module isolé : **fetch → normalize → upsert** ; le domaine métier n’appelle pas France Travail directement.
2. Cache token en mémoire (par process) avec TTL dérivé de `expires_in`.
3. Rate limit doc : **≤ 2 req/s** ; timeout + retry backoff.
4. Tests unitaires : **mock** du provider, pas d’appel réseau FT.
5. Si LBB down : app utilisable (Explorer, CRM) ; page Pistes en erreur explicite.

---

## Postman (régression manuelle)

1. Environment : `FT_CLIENT_ID`, `FT_CLIENT_SECRET`, `access_token` (optionnel, rempli via script Tests).
2. POST token (URL + scope ci-dessus).
3. GET `nombreEntreprise` avec Bearer + params Toulouse / ROME (`hits` > 0).
4. GET `recherche` avec les **mêmes** params + `page=1&page_size=10` — vérifier `items[].siret` (14 chiffres) et `hits`.

Ne pas committer de réponse réelle (SIRET / raisons sociales toulousaines) : la fixture Git = exemple Stoplight Metz.
