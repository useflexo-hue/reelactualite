import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { NewsroomHeader, NewsroomMain } from "@/components/newsroom/NewsroomHeader";
import { HeaderAdSlot } from "@/components/site/HeaderAdSlot";
import { MediaUploader } from "@/components/newsroom/MediaUploader";
import { getHeaderSponsors, saveHeaderSponsors } from "@/lib/ads.functions";
import { isSponsorLive, type Sponsor } from "@/lib/ads";

export const Route = createFileRoute("/_authenticated/redaction/publicite")({
  component: AdsPage,
  head: () => ({
    meta: [
      { title: "Publicité — Rédaction ReelActu" },
      {
        name: "description",
        content:
          "Gérer les encarts publicitaires du bandeau ReelActu : annonceurs, accroches et liens.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Publicité — Rédaction ReelActu" },
      {
        property: "og:description",
        content: "Gestion des espaces sponsorisés du bandeau ReelActu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const field =
  "w-full rounded-md border border-rule bg-background px-3 py-2 text-base outline-none focus:border-signal";
const label = "mb-1 block font-sans text-xs uppercase tracking-wide text-muted-foreground";

/** ISO -> valeur d'un <input type="datetime-local"> (heure locale). */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

function ScheduleBadge({ sponsor }: { sponsor: Sponsor }) {
  const now = new Date();
  const live = isSponsorLive(sponsor, now);
  const upcoming =
    !live && sponsor.starts_at && Date.parse(sponsor.starts_at) > now.getTime();

  const text = live
    ? "En ligne"
    : upcoming
      ? `Programmée · ${dateFmt.format(new Date(sponsor.starts_at!))}`
      : `Terminée${sponsor.ends_at ? ` · ${dateFmt.format(new Date(sponsor.ends_at))}` : ""}`;

  return (
    <span
      className={
        "rounded-full px-2 py-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide " +
        (live
          ? "bg-signal/10 text-signal"
          : upcoming
            ? "bg-brand-blue/10 text-brand-blue"
            : "bg-muted text-muted-foreground")
      }
    >
      {text}
    </span>
  );
}

function AdsPage() {
  const fetchSponsors = useServerFn(getHeaderSponsors);
  const save = useServerFn(saveHeaderSponsors);

  const { data, isLoading } = useQuery({
    queryKey: ["header-sponsors", "admin"],
    queryFn: () => fetchSponsors({ data: { all: true } }),
  });

  const [rows, setRows] = useState<Sponsor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  function update(i: number, patch: Partial<Sponsor>) {
    setRows((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  /** Champ date/heure : vide = pas de contrainte, sinon on stocke en ISO. */
  function updateSchedule(i: number, key: "starts_at" | "ends_at", value: string) {
    setRows((list) =>
      list.map((r, idx) => {
        if (idx !== i) return r;
        if (!value) {
          const next = { ...r };
          delete next[key];
          return next;
        }
        const t = new Date(value);
        if (Number.isNaN(t.getTime())) return r;
        return { ...r, [key]: t.toISOString() };
      }),
    );
  }

  function add() {
    setRows((list) => [
      ...list,
      { id: `pub-${Date.now()}`, name: "", claim: "", url: "https://" },
    ]);
  }

  async function onSave() {
    const invalid = rows.some((r) => !r.name.trim() || !r.url.trim());
    if (invalid) {
      toast.error("Chaque annonce doit avoir un nom et un lien.");
      return;
    }
    const badRange = rows.some(
      (r) => r.starts_at && r.ends_at && Date.parse(r.ends_at) <= Date.parse(r.starts_at),
    );
    if (badRange) {
      toast.error("La fin de diffusion doit être postérieure au début.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { sponsors: rows } });
      toast.success("Publicités enregistrées. Le bandeau est à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Publicité" />
      <NewsroomMain>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Espaces sponsorisés</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Les annonces défilent automatiquement dans le bandeau supérieur du site.
              Laissez la liste vide pour masquer complètement l'encart.
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-md bg-signal px-5 font-sans text-sm font-semibold text-signal-foreground disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        <div className="mb-8 rounded-lg bg-brand-blue p-4">
          <p className="mb-2 font-sans text-[0.65rem] uppercase tracking-wide text-brand-blue-foreground/70">
            Aperçu dans le bandeau
          </p>
          <HeaderAdSlot theme="brand-blue" className="max-w-[26rem]" />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => (
              <div key={row.id} className="rounded-lg border border-rule p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                      Annonce {i + 1}
                    </span>
                    <ScheduleBadge sponsor={row} />
                  </div>
                  <button
                    type="button"
                    aria-label="Supprimer cette annonce"
                    onClick={() => setRows((list) => list.filter((_, idx) => idx !== i))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-signal hover:underline"
                  >
                    <Trash2 className="size-4" /> Supprimer
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor={`name-${row.id}`}>
                      Annonceur
                    </label>
                    <input
                      id={`name-${row.id}`}
                      className={field}
                      value={row.name}
                      maxLength={60}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`claim-${row.id}`}>
                      Légende / accroche (40 caractères conseillés)
                    </label>
                    <input
                      id={`claim-${row.id}`}
                      className={field}
                      value={row.claim}
                      maxLength={140}
                      onChange={(e) => update(i, { claim: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className={label}>Média publicitaire (photo, vidéo ou audio)</span>
                    <MediaUploader
                      value={row.media_url ?? ""}
                      {...(row.media_type ? { type: row.media_type } : {})}
                      onChange={(media) =>
                        setRows((list) =>
                          list.map((r, idx) => {
                            if (idx !== i) return r;
                            if (!media) {
                              const { media_url: _u, media_type: _t, ...rest } = r;
                              return rest;
                            }
                            return { ...r, media_url: media.url, media_type: media.type };
                          }),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`url-${row.id}`}>
                      Lien de destination
                    </label>
                    <input
                      id={`url-${row.id}`}
                      className={field}
                      value={row.url}
                      inputMode="url"
                      onChange={(e) => update(i, { url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`logo-${row.id}`}>
                      Logo (URL, facultatif)
                    </label>
                    <input
                      id={`logo-${row.id}`}
                      className={field}
                      value={row.logo ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((list) =>
                          list.map((r, idx) => {
                            if (idx !== i) return r;
                            if (!v) {
                              const { logo: _drop, ...rest } = r;
                              return rest;
                            }
                            return { ...r, logo: v };
                          }),
                        );
                      }}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`start-${row.id}`}>
                      Début de diffusion (facultatif)
                    </label>
                    <input
                      id={`start-${row.id}`}
                      type="datetime-local"
                      className={field}
                      value={toLocalInput(row.starts_at)}
                      onChange={(e) => updateSchedule(i, "starts_at", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={label} htmlFor={`end-${row.id}`}>
                      Fin de diffusion (facultatif)
                    </label>
                    <input
                      id={`end-${row.id}`}
                      type="datetime-local"
                      className={field}
                      value={toLocalInput(row.ends_at)}
                      onChange={(e) => updateSchedule(i, "ends_at", e.target.value)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sans dates, l'annonce est diffusée en permanence.
                </p>
              </div>
            ))}

            <button
              type="button"
              onClick={add}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-rule px-4 font-sans text-sm font-semibold"
            >
              <Plus className="size-4" /> Ajouter une annonce
            </button>
          </div>
        )}
      </NewsroomMain>
    </div>
  );
}
