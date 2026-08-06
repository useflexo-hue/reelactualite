import type { Sponsor, SponsorMediaType } from "@/lib/ads";

export const HEADER_SPONSORS_KEY = "header_sponsors";

function isoOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function mediaTypeOrUndefined(value: unknown): SponsorMediaType | undefined {
  return value === "image" || value === "video" || value === "audio" ? value : undefined;
}

export function cleanSponsors(list: unknown): Sponsor[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((raw, i): Sponsor => {
      const s = (raw ?? {}) as Partial<Sponsor>;
      const sponsor: Sponsor = {
        id: String(s.id ?? `pub-${i + 1}`),
        name: String(s.name ?? "").slice(0, 60),
        claim: String(s.claim ?? "").slice(0, 140),
        url: String(s.url ?? ""),
      };
      if (s.logo) sponsor.logo = String(s.logo);
      const mediaType = mediaTypeOrUndefined(s.media_type);
      if (s.media_url && mediaType) {
        sponsor.media_url = String(s.media_url);
        sponsor.media_type = mediaType;
      }
      const startsAt = isoOrUndefined(s.starts_at);
      if (startsAt) sponsor.starts_at = startsAt;
      const endsAt = isoOrUndefined(s.ends_at);
      if (endsAt) sponsor.ends_at = endsAt;
      return sponsor;
    })
    .filter((s) => s.name.trim() !== "" && s.url.trim() !== "");
}

