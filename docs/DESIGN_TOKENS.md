# Design tokens — Sonar

Source des couleurs : palette **Tailwind CSS v4** + variables sémantiques **shadcn** (`:root` / `.dark` dans `apps/web/app/globals.css`).  
Police **Inter**.

**Clair par défaut.** Le sombre, c’est le mécanisme shadcn : classe `.dark` sur `<html>`, posée par le toggle (pas un `<script>` next-themes — React 19 le refuse dans un composant client). Le thème choisi est stocké dans `localStorage` (`sonar-theme`).

Les composants lisent `--background`, `--primary`, etc. Ne pas coller des hex en dur dans les pages.

## Surfaces (clair — défaut)

| Token sémantique | Palette | Rôle |
|---|---|---|
| `--background` | slate-50 | Fond de page |
| `--card` | blanc | Cartes |
| `--muted` / `--secondary` | slate-100 | Zones secondaires |
| `--border` | slate-200 | Filets |
| `--foreground` | slate-900 | Texte |
| `--muted-foreground` | slate-600 | Texte secondaire |

## Surfaces (`.dark`)

| Token sémantique | Palette | Rôle |
|---|---|---|
| `--background` | slate-900 | Fond |
| `--card` | slate-800 | Cartes |
| `--muted` / `--border` | slate-700 | Secondaire / filets |
| `--foreground` | slate-50 | Texte |
| `--muted-foreground` | slate-400 | Texte secondaire |

## Accent

| Token | Palette | Rôle |
|---|---|---|
| `--primary` (clair) | sky-500 | CTA, badge, focus |
| `--primary` (sombre) | sky-400 | Même rôle, plus lisible |
| `--primary-foreground` | slate-950 | Texte sur bouton primary |

## Typo

- `--font-sans` / `--font-heading` → `var(--font-inter)`
- Corps : `font-sans` ; titres : tracking serré, poids 600

## Marque (ticket #37)

Dégradé **sky -> indigo**, réservé au logo « Sonar » et à des accents ponctuels (halo d'accueil). Jamais sur du texte courant ni sur les boutons.

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--brand-from` | sky-600 (contraste sur fond clair) | sky-400 | début du dégradé |
| `--brand-to` | indigo-500 | indigo-400 | fin du dégradé |

Utilitaires (`globals.css`) : `text-brand` (texte en dégradé, utilisé par le logo), classes Tailwind `from-brand-from` / `to-brand-to`.

Définis mais **pas encore utilisés** (appliqués par les tickets cartes / accueil) : `bg-brand-glow` (halo doux derrière un bloc d'accueil), `card-lift`, `--shadow-card`, `--shadow-card-hover`.

## Ton et densité

Plus chaleureux et plus aéré : titres et marque plus grands, cartes avec ombre douce, halo de marque sur l'accueil. Pas d'illustration ni d'image décorative pour l'instant.

- Échelle de titres : marque `text-2xl font-bold` ; titre de page d'accueil `text-4xl` à `md:text-5xl` ; titres de section `text-2xl font-semibold` ; corps `text-base` ; légendes `text-sm`/`text-xs`.
- Conteneur large : `max-w-6xl` pour l'en-tête ; marges horizontales `px-6` (mobile), `md:px-8` (ordinateur).
- Ombres : `--shadow-card` (repos) et `--shadow-card-hover` (survol), définies dans un `@theme` simple, avec variante `.dark` plus forte (noir). Pas encore utilisées (tickets cartes / accueil).

## Radius

`--radius: 0.75rem` (était 0.625rem : angles un peu plus doux, tout l'échelle `rounded-*` suit).

## Mouvement

Un seul langage : **lent et discret**, 300 ms, courbe `--ease-calm` (classe `ease-calm`).

- Cartes cliquables : classe `card-lift` (monte de 2 px, ombre plus marquée, filet teinté de `--primary`), pas encore utilisée.
- Boutons : transition 300 ms sur couleur, ombre, filet et `transform` ; bouton principal prend `shadow-md` au survol. L'appui actif (1 px) est instantané sous mouvement réduit.
- Liens du menu et logo : fondu de couleur 300 ms ; le logo s'éclaircit (`hover:brightness-110`) sans baisser le contraste.
- Curseur : `pointer` sur tout `button`/`[role=button]` actif (règle globale), `not-allowed` sur les boutons natifs `:disabled` uniquement (le `Button` shadcn utilise `pointer-events-none`, donc pas de curseur). Les liens gardent le pointeur natif.
- `prefers-reduced-motion: reduce` : plus de transition ni de déplacement (`motion-reduce:transition-none`, repli intégré à `card-lift`).

## En-tête

Conteneur `max-w-6xl`, `py-4`, écarts `gap-x-8`. Marque à gauche, menu juste après, **slot session (thème, email, Déconnexion) poussé à droite** (`ml-auto`, `gap-4`). La structure du menu (#18) ne change pas.

## Interdit

- Compteurs marketing en dur (« 120+ entreprises »)
- Forcer `class="dark"` sur `<html>`
- Couleurs hors slate / sky / indigo (indigo : seulement via `--brand-to`) sans mise à jour de ce fichier
- Dégradé de marque sur du texte courant ou sur les boutons
- Animation de plus de 300 ms, ou qui ignore `prefers-reduced-motion`
