import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { resolveLegacyUrl } from "@/lib/legacy.functions";

/**
 * Attrape-tout : redirige en 301 les anciennes URL WordPress vers la page
 * correspondante du nouveau site (actif dès la bascule DNS).
 */
export const Route = createFileRoute("/$")({
  beforeLoad: async ({ location }) => {
    const { to } = (await resolveLegacyUrl({
      data: { path: location.pathname, search: location.searchStr ?? "" },
    })) as { to: string | null };

    if (to && to !== location.pathname) {
      throw redirect({ href: to, statusCode: 301, throw: true });
    }
  },
  head: () => ({ meta: [{ title: "Page introuvable — ReelActu" }, { name: "robots", content: "noindex" }] }),
  component: LegacyNotFound,
});

function LegacyNotFound() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-24 text-center">
      <p className="kicker">Erreur 404</p>
      <h1 className="mt-2 text-3xl">Cette page n'existe plus</h1>
      <p className="mt-3 font-sans text-sm text-muted-foreground">
        L'adresse demandée provient peut-être de l'ancien site.
      </p>
      <Link to="/" className="mt-6 inline-block font-sans text-sm font-semibold text-signal">
        Retour à la une
      </Link>
    </div>
  );
}
