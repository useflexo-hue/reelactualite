import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  getXConnectionStatus,
  getXTweetPreview,
  setXAutoBroadcast,
  testXWriteAccess,
} from "@/lib/x-connect.functions";
import { LogoLink } from "@/components/site/Logo";
import { SmartImage } from "@/components/site/SmartImage";

export const Route = createFileRoute("/_authenticated/redaction/x")({
  head: () => ({
    meta: [
      { title: "Connexion du compte X — Rédaction ReelActu" },
      {
        name: "description",
        content:
          "Connecter le compte X de ReelActu, tester le droit de publication et activer l'auto-diffusion des articles.",
      },
      { property: "og:title", content: "Connexion du compte X — Rédaction ReelActu" },
      {
        property: "og:description",
        content: "Vérification du jeton d'écriture X et activation de l'auto-diffusion ReelActu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: XConnectScreen,
});

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
      aria-hidden
    />
  );
}

function XConnectScreen() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getXConnectionStatus);
  const runTest = useServerFn(testXWriteAccess);
  const fetchPreview = useServerFn(getXTweetPreview);
  const toggle = useServerFn(setXAutoBroadcast);

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const status = useQuery({ queryKey: ["x-connection"], queryFn: () => fetchStatus() });
  const preview = useQuery({ queryKey: ["x-tweet-preview"], queryFn: () => fetchPreview() });
  const s = status.data;

  async function onTest() {
    setTesting(true);
    try {
      const res = await runTest();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      queryClient.invalidateQueries({ queryKey: ["x-connection"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test impossible.");
    } finally {
      setTesting(false);
    }
  }

  async function onToggle(enabled: boolean) {
    setSaving(true);
    try {
      await toggle({ data: { enabled } });
      toast.success(enabled ? "Auto-diffusion X activée." : "Auto-diffusion X désactivée.");
      queryClient.invalidateQueries({ queryKey: ["x-connection"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setSaving(false);
    }
  }

  const testedOk = s?.lastTestOk === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <LogoLink />
          <Link to="/redaction/reseaux" className="text-sm font-semibold text-primary hover:underline">
            ← Diffusion auto
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Connexion du compte X</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Le compte X de ReelActu se connecte avec un <strong>jeton d'écriture</strong> issu du portail
          développeurs X (offre Basic ou supérieure, permission « Read and write »). Le jeton est
          conservé côté serveur uniquement : il n'est jamais affiché ni envoyé au navigateur.
        </p>

        {status.isLoading && <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>}
        {status.error && (
          <p className="mt-8 text-sm text-destructive">
            {status.error instanceof Error ? status.error.message : "Chargement impossible."}
          </p>
        )}

        {s && (
          <div className="mt-8 space-y-4">
            {/* Étape 1 — jeton */}
            <section className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-2">
                <Dot ok={s.tokenConfigured} />
                <h2 className="font-semibold">1. Jeton d'écriture X</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.tokenConfigured
                  ? "Un jeton est enregistré de façon sécurisée."
                  : "Aucun jeton enregistré. Demandez-moi « enregistrer mon jeton X » dans le chat : un formulaire sécurisé s'ouvrira pour le saisir."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Où le trouver : portail développeurs X → votre application → Keys and tokens →
                « Access Token » utilisateur avec la permission Read and write.
              </p>
            </section>

            {/* Étape 2 — test */}
            <section className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-2">
                <Dot ok={testedOk} />
                <h2 className="font-semibold">2. Test du droit de publication</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Le test lit le compte, publie un message technique puis le supprime immédiatement.
                Aucune trace ne reste sur le compte.
              </p>
              {s.lastTestAt && (
                <p
                  className={`mt-3 rounded-md px-3 py-2 text-xs ${
                    testedOk ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {new Date(s.lastTestAt).toLocaleString("fr-FR")} — {s.lastTestMessage}
                </p>
              )}
              <button
                type="button"
                onClick={onTest}
                disabled={testing || !s.canManage || !s.tokenConfigured}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {testing ? "Test en cours…" : "Tester le droit de publication"}
              </button>
              {!s.canManage && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Réservé à la direction de publication.
                </p>
              )}
            </section>

            {/* Étape 3 — prévisualisation */}
            <section className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-2">
                <Dot ok={(preview.data?.length ?? 0) > 0} />
                <h2 className="font-semibold">3. Prévisualisation du tweet</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Voici le message exact qui partirait sur X pour les derniers articles. X compte
                chaque lien comme 23 caractères.
              </p>
              {preview.isLoading && (
                <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
              )}
              {preview.error && (
                <p className="mt-3 text-sm text-destructive">
                  {preview.error instanceof Error
                    ? preview.error.message
                    : "Prévisualisation indisponible."}
                </p>
              )}
              <div className="mt-4 space-y-4">
                {(preview.data ?? []).map((p) => (
                  <article key={p.slug} className="rounded-md border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {p.status}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                      {p.text}
                    </pre>
                    {p.imageUrl ? (
                      <SmartImage
                        src={p.imageUrl}
                        alt={`Aperçu de la une jointe au tweet : ${p.title}`}
                        width={600}
                        height={338}
                        className="mt-3 aspect-[16/9] w-full max-w-md rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Aucune image à la une : le tweet partira sans aperçu.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span
                        className={
                          p.weightedLength > p.limit
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {p.weightedLength}/{p.limit} caractères
                      </span>
                      <span className="text-muted-foreground">Lien : {p.url}</span>
                      {p.hashtags.length > 0 && (
                        <span className="text-muted-foreground">
                          Hashtags : {p.hashtags.join(" ")}
                        </span>
                      )}
                      {p.truncated && (
                        <span className="font-semibold text-destructive">
                          Message raccourci automatiquement
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {preview.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun article à prévisualiser.</p>
                )}
              </div>
            </section>

            {/* Étape 4 — activation */}
            <section className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-2">
                <Dot ok={s.autoBroadcast} />
                <h2 className="font-semibold">4. Auto-diffusion des articles sur X</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.handle ? `Compte détecté : @${s.handle}. ` : ""}
                Une fois activée, chaque article passé au statut « publié » est automatiquement
                publié sur X.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.autoBroadcast}
                  aria-label="Activer l'auto-diffusion sur X"
                  onClick={() => onToggle(!s.autoBroadcast)}
                  disabled={saving || !s.canManage || (!s.autoBroadcast && !testedOk)}
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                    s.autoBroadcast ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
                      s.autoBroadcast ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium">
                  {s.autoBroadcast ? "Activée" : "Désactivée"}
                </span>
              </div>
              {!testedOk && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Activation possible uniquement après un test de publication réussi.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
