/**
 * Emplacements publicitaires sponsorisés.
 *
 * `HEADER_SPONSORS` alimente le petit encart élégant du bandeau rouge, entre les
 * rubriques et Le Direct Radio. Laissez le tableau vide pour masquer l'encart.
 * Chaque annonce tourne automatiquement toutes les `SPONSOR_ROTATION_MS`.
 */
/** Familles de médias acceptées pour une annonce. */
export type SponsorMediaType = "image" | "video" | "audio";

export type Sponsor = {
  id: string;
  /** Nom de l'annonceur (affiché en gras). */
  name: string;
  /** Accroche / légende courte — 40 caractères conseillés. */
  claim: string;
  /** Lien de destination (ouvre un nouvel onglet, rel="sponsored"). */
  url: string;
  /** Logo optionnel (URL absolue ou chemin interne), affiché en médaillon. */
  logo?: string;
  /** Média publicitaire importé (photo, vidéo ou audio). */
  media_url?: string;
  media_type?: SponsorMediaType;
  /** Début de diffusion (ISO). Vide = diffusion immédiate. */
  starts_at?: string;
  /** Fin de diffusion (ISO). Vide = sans date de fin. */
  ends_at?: string;
};

export const SPONSOR_ROTATION_MS = 7000;

/** Une annonce est-elle diffusable à l'instant donné ? */
export function isSponsorLive(sponsor: Sponsor, now: Date = new Date()) {
  const t = now.getTime();
  if (sponsor.starts_at) {
    const start = Date.parse(sponsor.starts_at);
    if (!Number.isNaN(start) && t < start) return false;
  }
  if (sponsor.ends_at) {
    const end = Date.parse(sponsor.ends_at);
    if (!Number.isNaN(end) && t > end) return false;
  }
  return true;
}

/** Encarts de secours affichés tant que la rédaction n'a rien enregistré. */
export const DEFAULT_HEADER_SPONSORS: Sponsor[] = [
  {
    id: "espace-1",
    name: "Votre marque ici",
    claim: "Espace publicitaire disponible",
    url: "mailto:info@reelactu.com?subject=Publicit%C3%A9%20ReelActu",
  },
  {
    id: "espace-2",
    name: "Annoncez sur ReelActu",
    claim: "Audience RDC & Grands Lacs",
    url: "mailto:info@reelactu.com?subject=Publicit%C3%A9%20ReelActu",
  },
];
