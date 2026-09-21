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

## Radius

`--radius: 0.625rem` (défaut shadcn).

## Interdit

- Compteurs marketing en dur (« 120+ entreprises »)
- Forcer `class="dark"` sur `<html>`
- Couleurs hors slate / sky sans mise à jour de ce fichier
