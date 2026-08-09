export type ProjectCategory = "signal" | "ia" | "instrumentation" | "web";

export interface Project {
  slug: string;
  title: string;
  context: string;
  period: string;
  category: ProjectCategory;
  summary: string;
  bullets: string[];
  tags: string[];
  visual?: {
    type: "video" | "image" | "placeholder";
    src?: string;
    poster?: string;
  };
  status: "ready" | "stub" | "pending";
}

export const categories: Record<ProjectCategory, { label: string; color: string }> = {
  signal: { label: "Signal · RF · Radar", color: "var(--color-accent)" },
  ia: { label: "IA · NLP · Data", color: "var(--color-accent-3)" },
  instrumentation: { label: "Instrumentation · Capteurs", color: "var(--color-accent-2)" },
  web: { label: "Web · Side projects", color: "var(--color-fg-muted)" },
};

export const projects: Project[] = [
  {
    slug: "thales-antibrouillage",
    title: "Antibrouillage adaptatif spatial sur radar automobile millimétrique",
    context: "Thales × IMT Atlantique",
    period: "2025 — 2026",
    category: "signal",
    summary:
      "Implémentation et évaluation d'un algorithme LCMV pour le rejet adaptatif de brouillage sur un radar automobile mmW.",
    bullets: [
      "Implémentation et évaluation d'un algorithme LCMV en simulation MATLAB.",
      "Adaptation sur données expérimentales en présence de brouillage.",
      "Analyse des performances et amélioration de l'algorithme.",
    ],
    tags: ["Radar", "Traitement du signal", "Beamforming", "Python", "MATLAB"],
    visual: {
      type: "video",
      src: "/blender/thales-radar/placeholder.mp4",
      poster: "/blender/thales-radar/poster.jpg",
    },
    status: "ready",
  },
  {
    slug: "doc-sorter",
    title: "Classification automatique de documents métier — pipeline NLP local",
    context: "Politechnika Gdańska",
    period: "2026",
    category: "ia",
    summary:
      "Pipeline NLP local de classification de documents par embeddings + règles métier, exposé via une API FastAPI.",
    bullets: [
      "Pipeline local de classification par embeddings/règles métier.",
      "Centralisation de données issues de sources hétérogènes.",
      "Structuration du traitement via une API FastAPI.",
    ],
    tags: ["Python", "NLP", "Embeddings", "Classification", "FastAPI"],
    status: "stub",
  },
  {
    slug: "ia-explicable",
    title: "Détection, explication et reconstruction de fausses informations par IA",
    context: "IMT Atlantique",
    period: "2025 — 2026",
    category: "ia",
    summary:
      "Pipeline NLP combinant classification et interprétabilité, avec reconstruction textuelle d'une version corrigée.",
    bullets: [
      "Pipeline NLP combinant classification et interprétabilité.",
      "Reconstruction textuelle d'une version corrigée.",
    ],
    tags: ["Python", "PyTorch", "NLP", "Transformers", "Interprétabilité"],
    status: "stub",
  },
  {
    slug: "irradiance-solaire",
    title: "Mise en place d'un dispositif de mesure d'irradiance solaire",
    context: "IMT Atlantique",
    period: "2024 — 2025",
    category: "instrumentation",
    summary:
      "Montage expérimental d'un capteur d'irradiance avec acquisition par Arduino et propagation d'incertitudes par Monte-Carlo.",
    bullets: [
      "Montage expérimental avec capteur, acquisition par Arduino.",
      "Traitement de données et incertitudes par Monte-Carlo.",
    ],
    tags: ["Capteurs", "Arduino", "Traitement de données", "Incertitudes"],
    status: "stub",
  },
  {
    slug: "lexflow",
    title: "LexFlow — dictée vocale juridique 100 % locale",
    context: "Projet livré à un cabinet d'avocats",
    period: "2026",
    category: "ia",
    summary:
      "Dictée vocale sans aucun envoi de données : transcription Whisper sur GPU, vocabulaire juridique, reformulation par LLM local sous garde-fous.",
    bullets: [
      "Transcription Whisper large-v3-turbo sur CUDA, amorce de vocabulaire juridique.",
      "Correction typographique française et commandes de mise en forme dictées.",
      "Reformulation par LLM local avec garde-fous anti-hallucination (~0,9 s).",
    ],
    tags: ["Python", "Whisper", "CUDA", "LLM local", "NLP"],
    status: "ready",
  },
  {
    slug: "web-zero-dep",
    title: "Sites sur mesure — WebGL & zéro dépendance",
    context: "Personnel / freelance",
    period: "2026",
    category: "web",
    summary:
      "Sites vitrines premium écrits à la main, sans framework ni build : moteur WebGL/GLSL et animations en JavaScript natif.",
    bullets: [
      "LIMARE × EPOXY 27 — shaders de raymarching, moteur d'animation vanilla JS.",
      "Concept de refonte corporate bilingue FR/EN sur 19 pages.",
      "Site de cabinet d'avocats sous Next.js 15 (App Router, TypeScript).",
    ],
    tags: ["WebGL", "GLSL", "JavaScript", "Next.js", "UI/UX"],
    status: "stub",
  },
];
