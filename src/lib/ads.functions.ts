import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_HEADER_SPONSORS, isSponsorLive, type Sponsor } from "@/lib/ads";

/**
 * Lecture de l'encart publicitaire du bandeau (SSR).
 * Par défaut, seules les annonces dans leur fenêtre de diffusion sont renvoyées ;
 * `all: true` sert à l'écran de gestion en rédaction.
 */
export const getHeaderSponsors = createServerFn({ method: "GET" })
  .inputValidator((input?: { all?: boolean }) => input ?? {})
  .handler(async ({ data }): Promise<Sponsor[]> => {
    const { publicDb } = await import("./public-db.server");
    const { cleanSponsors, HEADER_SPONSORS_KEY } = await import("./ads.server");
    const { data: row } = await publicDb()
      .from("app_settings")
      .select("value")
      .eq("key", HEADER_SPONSORS_KEY)
      .maybeSingle();

    if (!row) return DEFAULT_HEADER_SPONSORS;
    const list = cleanSponsors((row.value as { sponsors?: unknown })?.sponsors);
    if (data.all) return list;
    const now = new Date();
    return list.filter((s) => isSponsorLive(s, now));
  });

/** Enregistrement depuis l'espace de rédaction (direction / rédaction en chef). */
export const saveHeaderSponsors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sponsors: Sponsor[] }) => input)
  .handler(async ({ data, context }): Promise<{ sponsors: Sponsor[] }> => {
    const { cleanSponsors, HEADER_SPONSORS_KEY } = await import("./ads.server");
    const sponsors = cleanSponsors(data.sponsors);
    const { error } = await context.supabase
      .from("app_settings")
      .upsert(
        {
          key: HEADER_SPONSORS_KEY,
          value: { sponsors },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { sponsors };
  });
