# La Bonne Boîte v2 — intégration backend (NestJS)

Référence pour le provider `providers/la-bonne-boite/` (Phase 4). Validé en Postman (sept. 2026).

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

## API métier

| Constante | Valeur |
|-----------|--------|
| **Base URL** | `https://api.francetravail.io/partenaire/labonneboite/v2` |
| **Auth header** | `Authorization: Bearer <access_token>` |
| **Accept** | `application/json` |

### Exemple — nombre d’entreprises (test / sanity check)

```http
GET /nombreEntreprise?rome=M1805&citycode=31555&distance=10
```

Paramètres query (voir Swagger pour la liste complète) :

- **`rome`** — code ROME (ex. `M1805` développeur informatique)
- **`citycode`** — code INSEE commune (Toulouse = `31555`)
- **`distance`** — rayon en km (ex. `10`)

Alternative localisation : `latitude` + `longitude` + `distance`, ou `department_number`, etc.

Réponse 200 : `{ "hits": number, "params": {...}, "resolved_params": {...} }`.

Pour la **liste** des entreprises (SIRET, raison sociale, …), utiliser l’opération documentée dans le même Swagger (pas `/company/` v1 ni `rome_codes`).

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
3. GET `nombreEntreprise` avec Bearer + params Toulouse / ROME.

Test de référence validé : `rome=M1805`, `citycode=31555`, `distance=10` → `hits` > 0.
