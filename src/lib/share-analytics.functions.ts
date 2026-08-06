import { createServerFn } from "@tanstack/react-start";

export type ShareEventPayload = {
  slug: string;
  network: string;
  referrer?: string | null;
};

const NETWORKS = ["facebook", "x", "whatsapp", "telegram", "copy_link"];

/** Enregistre un clic sur un bouton de partage (analytics interne). */
export const trackShare = createServerFn({ method: "POST" })
  .inputValidator((data: ShareEventPayload): ShareEventPayload => ({
    slug: String(data.slug ?? "").slice(0, 200),
    network: NETWORKS.includes(String(data.network)) ? String(data.network) : "unknown",
    referrer: data.referrer ? String(data.referrer).slice(0, 500) : null,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!data.slug || data.network === "unknown") return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("share_events").insert({
      article_slug: data.slug,
      network: data.network,
      referrer: data.referrer ?? null,
    });
    if (error) {
      console.error("share_events insert failed", error.message);
      return { ok: false };
    }
    return { ok: true };
  });
