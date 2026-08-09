# portfolio — status

**Phase:** building
**Live:** https://portfolio.pierrotandries.workers.dev
**Last content refresh:** 2026-08-09 — aligné sur le CV « Stage 2 février 2027 »
**Open case studies:**
- doc-sorter Phase 0 (drafting Sun May 3 Design block, file `src/content/case-studies/doc-sorter-phase-0.mdx`)

**Next milestone:** First case study live

## Stack

- **Astro** v6.x (minimal template, TypeScript strict)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **MDX** for case studies (markdown + optional component embeds)
- **Cloudflare** deploy (build from `main`)

## Où vit le contenu

- `src/data/copy.ts` — **tout le texte FR/EN du site** (hero, about, projets, parcours, hors école, contact). C'est le seul fichier à toucher pour une mise à jour de contenu.
- `src/data/projects.ts` — données de projets pour les futures case studies (pas encore rendues sur la home).
- `public/cv/CV-PA-Andries.pdf` — CV téléchargeable, lié depuis la nav et le bloc contact.
- `src/scripts/portfolio.ts` — easter-egg terminal (`whoami`, `skills`, `projects`, `contact`) : à resynchroniser avec `copy.ts`.
- `src/layouts/BaseLayout.astro` — meta description / OG.

## How to add a case study

1. Drop a new `.mdx` file in `src/content/case-studies/<slug>.mdx` with frontmatter (title, date, summary)
2. Commit + push → Cloudflare auto-deploys
3. Update this STATUS.md `Open case studies` list

## Hard rules (per playbook v2.0)

- Case studies publish only AFTER the underlying milestone has shipped — no aspirational case studies
- Portfolio NEVER displaces a top-weight project block (doc-sorter, studies-gdansk)
- 95% confidence rule applies — Claude proposes, user approves, before any portfolio commit

## Recent activity

- 2026-08-09: refonte du contenu — stage Stryx AI (lutte anti-drone, sept 2026 – févr 2027) ajouté, recherche de stage repositionnée sur février 2027, ajout des projets LexFlow et sites WebGL, loisirs/langues alignés sur le CV, CV PDF remplacé.
- 2026-04-28: Cloudflare auto-deploy connecté — première build live.
- 2026-04-28: scaffolded with Astro + Tailwind v4 + MDX (phase moved `not-started` → `building`)
