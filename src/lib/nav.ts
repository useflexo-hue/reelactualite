export type NavItem = { slug: string; name: string };

/**
 * Ordre éditorial officiel de la barre de navigation (ReelActu 2.0).
 * Le libellé peut différer du nom de la rubrique en base (ex. Tribune → opinions).
 */
export const NAV_HEADER: NavItem[] = [
  { slug: "rdc", name: "Actualité" },
  { slug: "politique", name: "Politique" },
  { slug: "investigations", name: "Enquête" },
  { slug: "guerre-securite", name: "Guerre" },
  { slug: "defense", name: "Défense" },
  { slug: "securite", name: "Sécurité" },
  { slug: "justice", name: "Justice" },
  { slug: "sante", name: "Santé" },
  { slug: "economie", name: "Économie" },
  { slug: "societe", name: "Société" },
  { slug: "culture", name: "Culture" },
  { slug: "sport", name: "Sport" },
  { slug: "fact-check", name: "Fact-check" },
  { slug: "decouverte", name: "Découverte" },
  { slug: "videos", name: "Vidéos" },
  { slug: "opinions", name: "Tribune" },
  { slug: "podcasts", name: "Podcast" },
  { slug: "interviews", name: "Interviews" },
  { slug: "nation", name: "Nation" },
  { slug: "afrique", name: "Afrique" },
  { slug: "monde", name: "Monde" },
];

export const NAV_PRIMARY: NavItem[] = NAV_HEADER.slice(0, 8);

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Actualité",
    items: NAV_HEADER.slice(0, 7),
  },
  {
    title: "Thèmes",
    items: NAV_HEADER.slice(7, 14),
  },
  {
    title: "Formats",
    items: NAV_HEADER.slice(14, 18),
  },
  {
    title: "Régions",
    items: [
      { slug: "nation", name: "Nation" },
      { slug: "nord-kivu", name: "Nord-Kivu" },
      { slug: "sud-kivu", name: "Sud-Kivu" },
      { slug: "ituri", name: "Ituri" },
      { slug: "afrique", name: "Afrique" },
      { slug: "monde", name: "Monde" },
    ],
  },
];
