import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SmartImage } from "@/components/site/SmartImage";
import { formatDateTime } from "@/lib/format";

type PreviewData = {
  title: string;
  dek?: string | null;
  body: string;
  cover_url?: string | null;
  cover_credit?: string | null;
  categoryName?: string | null;
  authorName?: string | null;
  location?: string | null;
  reading_minutes: number;
  is_breaking: boolean;
  is_featured: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PreviewData;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
};

/**
 * Prévisualisation fidèle (rendu mobile) de l'article avant publication :
 * image à la une, rubrique, titre, chapô, signature et corps de texte.
 */
export function ArticlePreview({
  open,
  onOpenChange,
  data,
  confirmLabel,
  onConfirm,
  busy = false,
}: Props) {
  const paragraphs = (data.body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Prévisualisation de l'article</DialogTitle>
          <DialogDescription>
            Rendu mobile tel qu'il apparaîtra pour les lecteurs.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-2xl border border-rule bg-background shadow-sm">
          {data.is_breaking ? (
            <div className="bg-signal px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-signal-foreground">
              Dernière minute
            </div>
          ) : null}

          <div className="aspect-[16/9] w-full overflow-hidden">
            <SmartImage
              src={data.cover_url || null}
              alt={data.title || "Image à la une"}
              width={780}
              height={439}
              className="h-full w-full object-cover"
              sizes="390px"
            />
          </div>
          {data.cover_credit ? (
            <p className="px-4 pt-2 text-[11px] text-muted-foreground">{data.cover_credit}</p>
          ) : null}

          <div className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              {data.categoryName ? (
                <span className="rounded bg-signal px-2 py-0.5 text-signal-foreground">
                  {data.categoryName}
                </span>
              ) : (
                <span className="rounded border border-rule px-2 py-0.5 text-muted-foreground">
                  Sans rubrique
                </span>
              )}
              {data.is_featured ? (
                <span className="rounded border border-rule px-2 py-0.5 text-muted-foreground">
                  À la une
                </span>
              ) : null}
            </div>

            <h1 className="font-serif text-2xl font-bold leading-tight">
              {data.title || "Titre de l'article"}
            </h1>

            {data.dek ? (
              <p className="text-[15px] leading-relaxed text-muted-foreground">{data.dek}</p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {[
                data.authorName ? `Par ${data.authorName}` : null,
                data.location || null,
                `${data.reading_minutes} min de lecture`,
                formatDateTime(new Date().toISOString()),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <div className="space-y-3 border-t border-rule pt-3">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i} className="font-serif text-[16px] leading-[1.7]">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm italic text-muted-foreground">Aucun contenu saisi.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-rule px-4 py-2 text-sm"
          >
            Continuer l'édition
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-md bg-signal px-5 py-2 text-sm font-semibold text-signal-foreground disabled:opacity-60"
          >
            {busy ? "Publication…" : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
