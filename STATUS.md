# portfolio — status

**Phase:** building
**Last deploy:** never
**Open case studies:**
- doc-sorter Phase 0 (drafting Sun May 3 Design block, file `src/content/case-studies/doc-sorter-phase-0.mdx`)

**Next milestone:** First case study live + first deploy to Cloudflare Pages

## Stack

- **Astro** v5.x (minimal template, TypeScript strict)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **MDX** for case studies (markdown + optional component embeds)
- **Cloudflare Pages** target deploy (free tier, build from `main`)

## How to add a case study

1. Drop a new `.mdx` file in `src/content/case-studies/<slug>.mdx` with frontmatter (title, date, summary)
2. Commit + push → Cloudflare auto-deploys
3. Update this STATUS.md `Open case studies` list and `Last deploy` date

## Hard rules (per playbook v2.0)

- Case studies publish only AFTER the underlying milestone has shipped — no aspirational case studies
- Portfolio NEVER displaces a top-weight project block (doc-sorter, studies-gdansk)
- 95% confidence rule applies — Claude proposes, user approves, before any portfolio commit

## Recent activity

- 2026-04-28: scaffolded with Astro + Tailwind v4 + MDX (phase moved `not-started` → `building`)
