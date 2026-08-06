/** Comptes officiels ReelActu — utilisés pour les liens du site et le JSON-LD `sameAs`. */
export type SocialPlatform =
  | "x"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "instagram"
  | "tiktok";

export const SOCIALS: {
  id: SocialPlatform;
  name: string;
  url: string;
  handle: string;
}[] = [
  { id: "x", name: "X", url: "https://x.com/ReelActu", handle: "@ReelActu" },
  {
    id: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61577186708359",
    handle: "ReelActu",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/reel-actu-09965936a/",
    handle: "Reel Actu",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/@ReelActu",
    handle: "@ReelActu",
  },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com/reelactu/",
    handle: "@reelactu",
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com/@reelactureelactu",
    handle: "@reelactureelactu",
  },
];

export const SOCIAL_SAME_AS = SOCIALS.map((s) => s.url);
