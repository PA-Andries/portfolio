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
    slug: "tipe-balle-tennis",
    title: "TIPE — comportement d'une balle de tennis lors d'un choc",
    context: "CPGE Pierre-Corneille",
    period: "2022 — 2024",
    category: "instrumentation",
    summary:
      "Étude mécanique et énergétique du rebond d'une balle de tennis, avec montages expérimentaux et mesure de l'énergie dissipée.",
    bullets: [
      "Montages avec photodiode, laser, Arduino et capteurs de force.",
      "Mesure de la vitesse, du coefficient de restitution et de l'énergie dissipée.",
      "Dissipation mesurée à 51 ± 22 mJ lors de la compression.",
    ],
    tags: ["Physique expérimentale", "Métrologie", "Arduino", "Capteurs", "Modélisation"],
    status: "stub",
  },
];
