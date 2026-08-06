import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Connexion rédaction — ReelActu" },
      {
        name: "description",
        content:
          "Espace réservé à la rédaction de ReelActu : connexion des journalistes et éditeurs pour rédiger et publier les articles.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Connexion rédaction — ReelActu" },
      {
        property: "og:description",
        content: "Accès réservé aux membres de la rédaction de ReelActu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/redaction", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Identifiants incorrects."
          : err.message,
      );
      return;
    }
    navigate({ to: "/redaction", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" withBaseline />
      </div>

      <h1 className="mb-1 text-center font-serif text-2xl font-bold">Espace rédaction</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Connexion réservée aux membres de la rédaction.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-rule p-5">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-wide">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-rule bg-background px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium uppercase tracking-wide"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-rule bg-background px-3 py-2 text-sm outline-none focus:border-signal"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-signal">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-signal px-4 py-2 text-sm font-semibold text-signal-foreground disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
