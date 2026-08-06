import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NewsroomHeader } from "@/components/newsroom/NewsroomHeader";

export const Route = createFileRoute("/_authenticated/redaction/compte")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Mon compte — Rédaction ReelActu" },
      {
        name: "description",
        content:
          "Gérer son compte de rédaction ReelActu : changement du mot de passe et sécurité de l'accès.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Mon compte — Rédaction ReelActu" },
      {
        property: "og:description",
        content: "Sécurité du compte de la rédaction ReelActu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function score(pwd: string) {
  let s = 0;
  if (pwd.length >= 12) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

function AccountPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = score(next);
  const strengthLabel = ["Très faible", "Faible", "Moyen", "Bon", "Excellent"][strength];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) {
      toast.error("Le nouveau mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    if (strength < 3) {
      toast.error("Mot de passe trop simple : ajoutez majuscules, chiffres et symboles.");
      return;
    }
    if (next !== confirm) {
      toast.error("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (next === current) {
      toast.error("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Session expirée, reconnectez-vous.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInError) throw new Error("Mot de passe actuel incorrect.");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);

      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Mot de passe mis à jour. Il sera demandé à la prochaine connexion.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NewsroomHeader section="Mon compte" />

      <main
        className="mx-auto max-w-md px-3 py-8 sm:px-4 sm:py-10"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <h1 className="mb-1 font-serif text-xl font-bold sm:text-2xl">Changer le mot de passe</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Remplacez le mot de passe par défaut par un mot de passe personnel et unique.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-rule p-4 sm:p-5">

          <div>
            <label
              htmlFor="current"
              className="mb-1 block text-xs font-medium uppercase tracking-wide"
            >
              Mot de passe actuel
            </label>
            <input
              id="current"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="h-11 w-full rounded-md border border-rule bg-background px-3 text-base outline-none focus:border-signal"
            />
          </div>

          <div>
            <label
              htmlFor="next"
              className="mb-1 block text-xs font-medium uppercase tracking-wide"
            >
              Nouveau mot de passe
            </label>
            <input
              id="next"
              type="password"
              required
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="h-11 w-full rounded-md border border-rule bg-background px-3 text-base outline-none focus:border-signal"
            />
            {next ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Robustesse : <strong>{strengthLabel}</strong> — 12 caractères minimum recommandés,
                avec majuscules, chiffres et symboles.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="mb-1 block text-xs font-medium uppercase tracking-wide"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full rounded-md border border-rule bg-background px-3 text-base outline-none focus:border-signal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-md bg-signal px-4 text-sm font-semibold text-signal-foreground disabled:opacity-60"
          >
            {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </main>
    </div>
  );
}
