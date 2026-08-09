# portfolio — Pierre-Antoine Andriès

Portfolio personnel : élève ingénieur IMT Atlantique (signal, télécoms, IA).
Site statique bilingue FR/EN, une seule page, avec un globe WebGL en fond.

**En ligne :** https://portfolio.pierrotandries.workers.dev

## Stack

Astro 6 · Tailwind CSS v4 (`@tailwindcss/vite`) · MDX · Three.js · TypeScript strict.
Déploiement Cloudflare depuis `main`.

## Commandes

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # build vers ./dist/
npm run preview  # prévisualise le build
```

## Structure

```
public/
  cv/CV-PA-Andries.pdf     CV téléchargeable (nav + bloc contact)
  backdrop/                textures du globe
src/
  data/copy.ts             TOUT le texte FR/EN du site
  data/projects.ts         données projets (futures case studies)
  components/portfolio/    Hero, About, Projects, Parcours, Extra, FinalCTA…
  scripts/portfolio.ts     nav, i18n, terminal easter-egg
  scripts/backdrop.ts      globe WebGL (Three.js)
  styles/global.css        design system
  pages/index.astro        assemblage de la page
```

## Mettre à jour le contenu

Presque tout se passe dans [`src/data/copy.ts`](src/data/copy.ts) : les objets `fr` et `en`
ont exactement la même forme, les composants indexent les deux tableaux en parallèle —
si tu ajoutes une entrée d'un côté, ajoute-la au même index de l'autre.

Penser aussi à resynchroniser :
- le CV dans `public/cv/CV-PA-Andries.pdf`
- les réponses du terminal dans `src/scripts/portfolio.ts` (`whoami`, `skills`, `projects`)
- la meta description dans `src/layouts/BaseLayout.astro`

Voir [STATUS.md](STATUS.md) pour l'état d'avancement.
