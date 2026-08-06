import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Search, Moon, Sun } from "lucide-react";
import { NAV_HEADER, NAV_GROUPS } from "@/lib/nav";
import { LogoMark } from "@/components/site/Logo";
import { RadioLive } from "@/components/site/RadioLive";
import { HeaderAdSlot } from "@/components/site/HeaderAdSlot";
import { HeaderDateTime } from "@/components/site/HeaderDateTime";

function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("reelactu-theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <button
      type="button"
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("reelactu-theme", next ? "dark" : "light");
      }}
      className={className}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        navigate({ to: "/recherche", search: term ? { q: term } : {} });
      }}
      className="flex h-9 items-center gap-2 rounded-full border border-brand-blue-foreground/25 bg-brand-blue-foreground/10 px-3 transition-colors focus-within:border-brand-blue-foreground/60"
    >
      <Search className="size-4 shrink-0 text-brand-blue-foreground/75" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher…"
        aria-label="Rechercher un article"
        className="w-28 min-w-0 bg-transparent font-sans text-sm text-brand-blue-foreground placeholder:text-brand-blue-foreground/55 focus:outline-none xl:w-40"
      />
    </form>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      {/* Section 1 — barre principale : logo, date, recherche, thème, publicité, radio */}
      <div className="bg-brand-blue text-brand-blue-foreground">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 lg:gap-6 lg:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Ouvrir les rubriques"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="-ml-1 p-1.5 text-brand-blue-foreground lg:hidden"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>

            <Link
              to="/"
              aria-label="ReelActu — L'information Réelle"
              className="shrink-0 text-brand-blue-foreground"
            >
              <span className="flex items-center gap-2.5">
                <LogoMark className="size-9 lg:size-12" variant="blanc" />
                <span className="flex flex-col leading-none">
                  <span className="font-sans text-xl font-extrabold tracking-tight lg:text-[2rem]">
                    ReelActu
                  </span>
                  <span className="mt-1 hidden font-sans text-[0.55rem] font-semibold tracking-[0.22em] text-brand-blue-foreground/85 uppercase sm:block">
                    L'information Réelle
                  </span>
                </span>
              </span>
            </Link>

            <span
              aria-hidden
              className="ml-3 hidden h-8 w-px bg-brand-blue-foreground/20 md:block"
            />
            <HeaderDateTime className="ml-3 hidden md:block" />
          </div>

          {/* Espace annonceur discret, centré */}
          <div className="hidden min-w-0 justify-center lg:flex">
            <HeaderAdSlot theme="brand-blue" className="max-w-[22rem]" />
          </div>
          <span className="lg:hidden" />

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <div className="hidden lg:block">
              <HeaderSearch />
            </div>
            <Link
              to="/recherche"
              aria-label="Rechercher un article"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-brand-blue-foreground/85 transition-colors hover:bg-brand-blue-foreground/10 hover:text-brand-blue-foreground lg:hidden"
            >
              <Search className="size-5" />
            </Link>
            <ThemeToggle className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-brand-blue-foreground/85 transition-colors hover:bg-brand-blue-foreground/10 hover:text-brand-blue-foreground" />
            <span aria-hidden className="hidden h-8 w-px bg-brand-blue-foreground/20 sm:block" />
            <div className="flex items-center rounded-full bg-brand-blue-foreground/10 px-1.5 py-1 lg:px-3 lg:py-1.5">
              <RadioLive compact />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 — navigation seule, fixe au défilement */}
      <div className="sticky top-0 z-40 bg-signal text-signal-foreground shadow-sm">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 px-4">
          <nav
            aria-label="Rubriques"
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-x-4 overflow-x-auto py-2.5 whitespace-nowrap"
          >
            {NAV_HEADER.map((item) => (
              <Link
                key={item.slug}
                to="/category/$slug"
                params={{ slug: item.slug }}
                className="font-sans text-[0.78rem] font-bold tracking-wide text-signal-foreground/90 uppercase transition-colors hover:text-signal-foreground"
                activeProps={{ className: "text-signal-foreground underline underline-offset-8" }}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            aria-label="Toutes les rubriques"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 border-l border-signal-foreground/25 py-2.5 pl-3 font-sans text-[0.78rem] font-bold tracking-wide text-signal-foreground/90 uppercase transition-colors hover:text-signal-foreground"
          >
            Plus
          </button>
        </div>

        {open ? (
          <div className="border-t border-signal-foreground/20 bg-background text-foreground">
            <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="kicker-muted mb-2">{group.title}</p>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.slug}`}>
                        <Link
                          to="/category/$slug"
                          params={{ slug: item.slug }}
                          onClick={() => setOpen(false)}
                          className="font-sans text-sm text-foreground/85 hover:text-signal"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
