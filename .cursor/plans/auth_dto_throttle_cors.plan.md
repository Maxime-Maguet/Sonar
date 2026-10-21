---
name: Auth DTO throttle CORS
overview: "Fermer le bloc Auth restant : DTO class-validator sur register/login (le ValidationPipe global devient enfin actif), rate-limit 5/min sur POST /auth/login via @nestjs/throttler, CORS strict sur WEB_ORIGIN sans fallback localhost. Hors scope : CRM, Sirene public, LBB, front."
todos:
  - id: dto-register-login
    content: Créer RegisterDto / LoginDto, brancher le contrôleur, typer le service, déplacer les tests de forme
    status: completed
  - id: dto-validator-review
    content: Revue dto-validator après écriture des DTO
    status: completed
  - id: throttle-login
    content: Installer @nestjs/throttler, 5 req/60s sur POST /auth/login, spec 429
    status: pending
  - id: cors-strict
    content: CORS origin = WEB_ORIGIN via ConfigService, helper testable, plus de fallback localhost
    status: pending
  - id: todo-verify
    content: Cocher le TODO, tsc + vitest + lint
    status: pending
isProject: true
---

# Auth V1 : DTO, throttle login, CORS strict

Section 1 (DTO) **déjà livrée** sur `main` (`b5c2a60`). Exécuter seulement **§2 throttle** puis **§3 CORS**. Hors scope : LBB, front, CRM, `POST /sirene/:siret/create`.

Sources : NestJS ValidationPipe / CORS ([docs.nestjs.com](https://docs.nestjs.com)), `@nestjs/throttler` actuel (`ThrottlerModule.forRoot`, `seconds()`, `@Throttle` / `@SkipThrottle`). `class-validator` et `class-transformer` sont déjà dans [apps/api/package.json](apps/api/package.json). Le pipe global existe déjà dans [apps/api/src/main.ts](apps/api/src/main.ts).

```mermaid
sequenceDiagram
  participant Browser
  participant Cors as enableCors
  participant Csrf as CsrfGuard
  participant Pipe as ValidationPipe
  participant Throttle as ThrottlerGuard
  participant Auth as AuthService
  Browser->>Cors: POST /auth/login Origin WEB_ORIGIN credentials
  Cors->>Csrf: preflight OK puis POST
  Csrf->>Pipe: Origin egal WEB_ORIGIN
  Pipe->>Throttle: RegisterDto ou LoginDto
  Throttle->>Auth: quota IP login OK
  Auth-->>Browser: 200 plus cookie sonar_session
```

---

## 1. DTO register / login — FAIT

Ne pas réimplémenter. Fichiers : `apps/api/src/auth/dto/`. Email trim+lowercase, password `@IsString` `@IsNotEmpty` (pas de MinLength 12 dans le code livré). 72 octets restent dans `PasswordService`.

---

## 2. Throttle login

**Pourquoi.** Register/login sont publics. Sans quota, le dummy bcrypt (~250 ms) ne suffit pas contre le stuffing. Le TODO dit **throttle login** seulement : ne pas limiter `GET /health`, `GET /auth/me`, ni Sirene.

**Dépendance.** Ajouter `@nestjs/throttler` dans le workspace `api` (Nest 12, API `ThrottlerModule.forRoot` + helper `seconds()`).

**Config.** Importer le module dans [auth.module.ts](apps/api/src/auth/auth.module.ts) (pas un `APP_GUARD` global) :

- un throttler nommé `login` : **5 requêtes / 60 s / IP** (storage mémoire V1, un process Nest)
- sur `POST /auth/login` uniquement : `@UseGuards(ThrottlerGuard)` + `@Throttle({ login: { limit: 5, ttl: seconds(60) } })`
- **ne pas** throttle `register` dans cette passe

CSRF global tourne **avant**. Réponse **429**. Pas de Redis. Tracker = IP par défaut.

**Tests.** 5 POST login (même IP, mock AuthService) → 6e = 429. Mini app Nest (ValidationPipe + Throttler + Origin CSRF). Pas d’e2e Postgres.

---

## 3. CORS sans fallback localhost

Aujourd’hui dans [main.ts](apps/api/src/main.ts) : `origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000'`.

```ts
const config = app.get(ConfigService);
app.enableCors({
  origin: config.getOrThrow<string>("WEB_ORIGIN"),
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

Extraire `buildCorsOptions(webOrigin: string)` dans [apps/api/src/config/cors.options.ts](apps/api/src/config/cors.options.ts). CORS ≠ CSRF : les deux restent.

---

## 4. Docs TODO

Dans [PROJECT_CONTEXT_AND_TODO.md](PROJECT_CONTEXT_AND_TODO.md) : cocher throttle + CORS ; corriger « Prochain code : bloc A ». Isolation CRM et Sirene public = hors chantier.

---

## 5. Vérification

- `npm test -w api`
- `npx tsc --noEmit -p apps/api`
- `npm run lint -w api`

Pas de commit sauf demande explicite.
