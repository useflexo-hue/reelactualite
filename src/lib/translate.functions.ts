import { createServerFn } from "@tanstack/react-start";

export type TranslatePayload = {
  slug: string;
  lang: string;
  title: string;
  dek: string | null;
  body: string;
};

export type TranslateResult = {
  title: string;
  dek: string | null;
  body: string;
};

export const translateArticle = createServerFn({ method: "POST" })
  .inputValidator((data: TranslatePayload): TranslatePayload => ({
    slug: String(data.slug).slice(0, 200),
    lang: String(data.lang).slice(0, 40),
    title: String(data.title).slice(0, 500),
    dek: data.dek ? String(data.dek).slice(0, 1000) : null,
    body: String(data.body).slice(0, 20000),
  }))
  .handler(async ({ data }): Promise<TranslateResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Traduction indisponible");

    const source = JSON.stringify({ title: data.title, dek: data.dek, body: data.body });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es traducteur de presse. Traduis fidèlement le JSON fourni vers la langue demandée. " +
              "Conserve les sauts de ligne doubles du champ body, les noms propres et les sigles. " +
              "Réponds UNIQUEMENT avec un JSON valide {\"title\":string,\"dek\":string|null,\"body\":string}.",
          },
          { role: "user", content: `Langue cible: ${data.lang}\n\n${source}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Trop de demandes, réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    if (!res.ok) throw new Error("Échec de la traduction");

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as TranslateResult;
      return {
        title: parsed.title || data.title,
        dek: parsed.dek ?? null,
        body: parsed.body || data.body,
      };
    } catch {
      throw new Error("Réponse de traduction invalide");
    }
  });
