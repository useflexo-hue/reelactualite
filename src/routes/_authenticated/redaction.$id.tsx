import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  getNewsroomArticle,
  getNewsroomContext,
  saveNewsroomArticle,
  type ArticleInput,
  type NewsroomArticle,
} from "@/lib/newsroom.functions";
import { publishArticleToSocials } from "@/lib/social-publish.functions";
import { toast } from "sonner";
import { LogoLink } from "@/components/site/Logo";
import { ImageUploader } from "@/components/newsroom/ImageUploader";
import { BodyMediaButtons } from "@/components/newsroom/BodyMediaButtons";
import { ArticlePreview } from "@/components/newsroom/ArticlePreview";



export const Route = createFileRoute("/_authenticated/redaction/$id")({
  component: ArticleEditor,
  head: () => ({
    meta: [
      { title: "Éditeur d'article — ReelActu" },
      {
        name: "description",
        content: "Rédaction, relecture et publication d'un article sur ReelActu.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Éditeur d'article — ReelActu" },
      { property: "og:description", content: "Espace de rédaction ReelActu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const EMPTY: ArticleInput = {
  slug: "",
  title: "",
  dek: "",
  body: "",
  cover_url: "",
  cover_credit: "",
  category_id: null,
  author_id: null,
  co_author_ids: [],
  status: "brouillon",
  location: "",
  reading_minutes: 3,
  is_featured: false,
  is_breaking: false,
  seo_title: "",
  seo_description: "",
};

function toInput(a: NewsroomArticle): ArticleInput {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: a.dek ?? "",
    body: a.body ?? "",
    cover_url: a.cover_url ?? "",
    cover_credit: a.cover_credit ?? "",
    category_id: a.category_id,
    author_id: a.author_id,
    co_author_ids: a.co_author_ids ?? [],
    status: a.status,
    location: a.location ?? "",
    reading_minutes: a.reading_minutes,
    is_featured: a.is_featured,
    is_breaking: a.is_breaking,
    seo_title: a.seo_title ?? "",
    seo_description: a.seo_description ?? "",
  };
}

const field =
  "w-full rounded-md border border-rule bg-background px-3 py-2 text-sm outline-none focus:border-signal";
const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

function ArticleEditor() {
  const { id } = Route.useParams();
  const isNew = id === "nouveau";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchContext = useServerFn(getNewsroomContext);
  const fetchArticle = useServerFn(getNewsroomArticle);
  const save = useServerFn(saveNewsroomArticle);
  const broadcast = useServerFn(publishArticleToSocials);


  const ctx = useQuery({ queryKey: ["newsroom", "context"], queryFn: () => fetchContext() });
  const existing = useQuery({
    queryKey: ["newsroom", "article", id],
    queryFn: () => fetchArticle({ data: { id } }),
    enabled: !isNew,
  });

  const [form, setForm] = useState<ArticleInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (existing.data) {
      setForm(toInput(existing.data));
      setSlugTouched(true);
    }
  }, [existing.data]);

  function set<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Étape obligatoire : prévisualisation avant enregistrement/publication.
    setError(null);
    setMessage(null);
    setPreviewOpen(true);
  }

  async function doSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: ArticleInput = {
        ...form,
        slug: form.slug || slugify(form.title),
        reading_minutes: Number(form.reading_minutes) || 3,
      };
      const res = await save({ data: payload });
      queryClient.invalidateQueries({ queryKey: ["newsroom"] });
      setMessage(
        payload.status === "publie" ? "Article publié et en ligne." : "Article enregistré.",
      );

      // Diffusion automatique sur les réseaux sociaux dès la mise en ligne.
      if (payload.status === "publie") {
        try {
          const out = await broadcast({ data: { articleId: res.id } });
          const sent = out.results.filter((r) => r.status === "sent").map((r) => r.platform);
          const failed = out.results.filter((r) => r.status === "failed");
          if (sent.length > 0) toast.success(`Diffusé sur : ${sent.join(", ")}`);
          if (failed.length > 0) {
            toast.error(`Échec de diffusion : ${failed.map((f) => f.platform).join(", ")}`);
          }
          if (sent.length === 0 && failed.length === 0) {
            toast.info("Aucun réseau social connecté pour l'instant.");
          }
        } catch (broadcastErr) {
          toast.error(
            broadcastErr instanceof Error
              ? `Diffusion réseaux : ${broadcastErr.message}`
              : "Diffusion réseaux impossible.",
          );
        }
      }

      if (isNew) navigate({ to: "/redaction/$id", params: { id: res.id }, replace: true });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
      setPreviewOpen(false);
    }
  }

  const canPublish = ctx.data?.canPublish ?? false;
  const categoryName =
    (ctx.data?.categories ?? []).find((c) => c.id === form.category_id)?.name ?? null;
  const authorName =
    (ctx.data?.authors ?? []).find((a) => a.id === form.author_id)?.display_name ?? null;
  const coAuthorNames = (ctx.data?.authors ?? [])
    .filter((a) => form.co_author_ids.includes(a.id))
    .map((a) => a.display_name);
  const bylineName = [authorName, ...coAuthorNames].filter(Boolean).join(" et ") || null;


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[900px] items-center gap-4 px-4 py-3">
          <LogoLink size="sm" />
          <Link to="/redaction" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour aux articles
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-8">
        <h1 className="mb-6 font-serif text-2xl font-bold">
          {isNew ? "Nouvel article" : "Modifier l'article"}
        </h1>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className={labelCls}>
              Titre
            </label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  title: v,
                  slug: slugTouched ? f.slug : slugify(v),
                }));
              }}
              className={`${field} font-serif text-lg`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="slug" className={labelCls}>
                URL (slug)
              </label>
              <input
                id="slug"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="location" className={labelCls}>
                Lieu
              </label>
              <input
                id="location"
                value={form.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Goma"
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="dek" className={labelCls}>
              Chapô
            </label>
            <textarea
              id="dek"
              rows={2}
              value={form.dek ?? ""}
              onChange={(e) => set("dek", e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="body" className={labelCls}>
              Corps de l'article
            </label>
            <div className="mb-2">
              <BodyMediaButtons
                textareaRef={bodyRef}
                onInsert={(value) => set("body", value)}
              />
            </div>
            <textarea
              id="body"
              ref={bodyRef}
              rows={18}
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              className={`${field} font-serif leading-relaxed`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Séparez les paragraphes par une ligne vide. Utilisez les boutons ci-dessus pour
              insérer une photo ou une vidéo à l'endroit du curseur.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cover" className={labelCls}>
                Image de une
              </label>
              <input
                id="cover"
                value={form.cover_url ?? ""}
                onChange={(e) => set("cover_url", e.target.value)}
                placeholder="URL ou import ci-dessous"
                className={field}
              />
              <div className="mt-2">
                <ImageUploader
                  value={form.cover_url ?? ""}
                  onChange={(url) => set("cover_url", url)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="credit" className={labelCls}>
                Crédit photo
              </label>
              <input
                id="credit"
                value={form.cover_credit ?? ""}
                onChange={(e) => set("cover_credit", e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="category" className={labelCls}>
                Rubrique
              </label>
              <select
                id="category"
                value={form.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className={field}
              >
                <option value="">—</option>
                {(ctx.data?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="author" className={labelCls}>
                Signature
              </label>
              <select
                id="author"
                value={form.author_id ?? ""}
                onChange={(e) => set("author_id", e.target.value || null)}
                className={field}
              >
                <option value="">—</option>
                {(ctx.data?.authors ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="minutes" className={labelCls}>
                Temps de lecture (min)
              </label>
              <input
                id="minutes"
                type="number"
                min={1}
                value={form.reading_minutes}
                onChange={(e) => set("reading_minutes", Number(e.target.value))}
                className={field}
              />
            </div>
          </div>

          <div>
            <span className={labelCls}>Autres journalistes signataires</span>
            <div className="flex flex-wrap gap-3 rounded-md border border-rule p-3">
              {(ctx.data?.authors ?? []).filter((a) => a.id !== form.author_id).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun autre journaliste disponible.
                </p>
              ) : (
                (ctx.data?.authors ?? [])
                  .filter((a) => a.id !== form.author_id)
                  .map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.co_author_ids.includes(a.id)}
                        onChange={(e) =>
                          set(
                            "co_author_ids",
                            e.target.checked
                              ? [...form.co_author_ids, a.id]
                              : form.co_author_ids.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.display_name}
                    </label>
                  ))
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Coché(s) : co-signature(s) affichée(s) après l'auteur principal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seo_title" className={labelCls}>
                Titre SEO
              </label>
              <input
                id="seo_title"
                value={form.seo_title ?? ""}
                onChange={(e) => set("seo_title", e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="seo_desc" className={labelCls}>
                Description SEO
              </label>
              <input
                id="seo_desc"
                value={form.seo_description ?? ""}
                onChange={(e) => set("seo_description", e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 rounded-md border border-rule p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => set("is_featured", e.target.checked)}
              />
              À la une
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_breaking}
                onChange={(e) => set("is_breaking", e.target.checked)}
              />
              Dernière minute
            </label>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="status" className="text-xs uppercase tracking-wide text-muted-foreground">
                Statut
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as ArticleInput["status"])}
                className="rounded-md border border-rule bg-background px-2 py-1.5 text-sm"
              >
                <option value="brouillon">Brouillon</option>
                <option value="relecture">En relecture</option>
                <option value="valide">Validé</option>
                {canPublish ? <option value="publie">Publié (en ligne)</option> : null}
              </select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-signal">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-signal px-5 py-2 text-sm font-semibold text-signal-foreground disabled:opacity-60"
            >
              {form.status === "publie" ? "Prévisualiser et publier" : "Prévisualiser et enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-md border border-rule px-4 py-2 text-sm"
            >
              Aperçu mobile
            </button>
            {form.status === "publie" && form.slug ? (
              <Link
                to="/$slug"
                params={{ slug: form.slug }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Voir l'article en ligne
              </Link>
            ) : null}
          </div>
        </form>

        <ArticlePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          busy={saving}
          confirmLabel={form.status === "publie" ? "Publier maintenant" : "Enregistrer"}
          onConfirm={doSave}
          data={{
            title: form.title,
            dek: form.dek,
            body: form.body,
            cover_url: form.cover_url,
            cover_credit: form.cover_credit,
            categoryName,
            authorName: bylineName,
            location: form.location,
            reading_minutes: Number(form.reading_minutes) || 3,
            is_breaking: form.is_breaking,
            is_featured: form.is_featured,
          }}
        />

      </main>
    </div>
  );
}
