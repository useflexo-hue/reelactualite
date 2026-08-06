import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/site/Logo";

/**
 * En-tête commun aux écrans de rédaction.
 * Responsive : barre collante, navigation défilante sur mobile,
 * marge de sécurité iOS (encoche / Dynamic Island).
 */
export function NewsroomHeader({ section }: { section: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link =
    "inline-flex h-9 shrink-0 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground";

  return (
    <header
      className="sticky top-0 z-30 border-b border-rule bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-[1100px] px-3 py-2 sm:px-4 sm:py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LogoLink size="sm" />
            <span className="truncate font-sans text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs">
              {section}
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-9 shrink-0 items-center rounded-md px-2 text-sm font-semibold text-signal hover:underline"
          >
            Déconnexion
          </button>
        </div>

        <nav className="-mx-3 mt-1 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:mt-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <Link to="/redaction" className={link}>
            Articles
          </Link>
          <Link
            to="/redaction/direct"
            search={{ days: 7, only: "all", from: undefined, to: undefined }}
            className={link}
          >
            Direct
          </Link>
          <Link to="/redaction/partages" search={{ days: 30, network: "all" }} className={link}>
            Partages
          </Link>
          <Link to="/redaction/reseaux" className={link}>
            Diffusion
          </Link>
          <Link to="/redaction/publicite" className={link}>
            Publicité
          </Link>
          <Link to="/redaction/compte" className={link}>
            Mon compte
          </Link>
          <Link to="/" className={link}>
            Voir le site
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Conteneur de page : largeurs, marges et zone sûre iOS en bas. */
export function NewsroomMain({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-[1100px] px-3 py-6 sm:px-4 sm:py-8"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </main>
  );
}
