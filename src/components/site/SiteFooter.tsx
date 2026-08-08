import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { Logo } from "@/components/site/Logo";
import { SocialLinks } from "@/components/site/SocialLinks";

import { cn } from "@/lib/utils";

export function SiteFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <footer className="mt-16 border-t border-rule bg-secondary">
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo size="md" variant="couleur" withBaseline />
            <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
              L'information vérifiée de la République démocratique du Congo, des Grands Lacs et du
              monde.
            </p>
            <p className="kicker-muted mt-5 mb-2">Suivez-nous</p>
            <SocialLinks />
          </div>


          {NAV_GROUPS.map((group) => {
            const groupOpen = openGroup === group.title;
            const contentId = `footer-group-${group.title.toLowerCase().replace(/\s+/g, "-")}`;
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => setOpenGroup((v) => (v === group.title ? null : group.title))}
                  aria-expanded={groupOpen}
                  aria-controls={contentId}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left md:cursor-default md:pointer-events-none"
                >
                  <span className="kicker-muted mb-2">{group.title}</span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-5 shrink-0 text-signal transition-transform md:hidden",
                      groupOpen && "rotate-180",
                    )}
                  />
                </button>
                <ul id={contentId} className={cn("space-y-1.5 md:!block", !groupOpen && "hidden")}>
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to="/category/$slug"
                        params={{ slug: item.slug }}
                        className="font-sans text-sm text-foreground/80 hover:text-signal"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="rule-top mt-8 grid gap-8 pt-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => setAboutOpen((v) => !v)}
              aria-expanded={aboutOpen}
              aria-controls="footer-about-content"
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left md:cursor-default md:pointer-events-none"
            >
              <span className="min-w-0">
                <span className="kicker-muted block">À propos de ReelActu</span>
                <span className="mt-1 block font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Qui sommes-nous ?
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-6 shrink-0 text-signal transition-transform md:hidden",
                  aboutOpen && "rotate-180",
                )}
              />
            </button>

            <div
              id="footer-about-content"
              className={cn("md:!block", !aboutOpen && "hidden")}
            >
              <p className="mt-4 font-sans text-base leading-[1.7] text-foreground sm:text-[1.05rem] sm:leading-relaxed">
                ReelActu est un média numérique indépendant basé en République démocratique du Congo,
                spécialisé dans la couverture de l'actualité nationale, régionale et internationale.
                Notre rédaction s'engage à fournir une information fiable, rapide et vérifiée, avec
                une attention particulière portée aux enjeux politiques, sécuritaires, économiques,
                diplomatiques, judiciaires, humanitaires, sanitaires et environnementaux.
              </p>
              <p className="mt-3 font-sans text-base leading-[1.7] text-foreground sm:text-[1.05rem] sm:leading-relaxed">
                Notre ligne éditoriale est indépendante de toute influence politique, économique ou
                idéologique, fondée sur des sources crédibles et recoupées. La rédaction est dirigée
                par Daniel Michombero, Directeur général.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[
                  "Indépendance éditoriale",
                  "Intégrité",
                  "Exactitude",
                  "Transparence",
                  "Responsabilité",
                ].map((v) => (
                  <li
                    key={v}
                    className="rounded-full border border-rule bg-background px-3 py-1.5 font-sans text-xs font-semibold text-foreground sm:text-sm"
                  >
                    {v}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/a-propos"
              className="mt-5 inline-flex min-h-11 items-center font-sans text-base font-semibold text-signal hover:underline sm:text-sm"
            >
              Lire la page complète « À propos » →
            </Link>
          </div>

          <div>
            <p className="kicker-muted mb-2">Contact</p>
            <div className="rounded-lg border border-rule bg-background p-4 font-sans text-base text-foreground sm:text-sm">
              <p className="text-muted-foreground">Email</p>
              <a
                href="mailto:info@reelactu.com"
                className="inline-flex min-h-11 items-center font-semibold break-all hover:text-signal"
              >
                info@reelactu.com
              </a>
              <p className="mt-1 text-muted-foreground">Téléphone</p>
              <a
                href="tel:+243994380568"
                className="inline-flex min-h-11 items-center font-semibold hover:text-signal"
              >
                +243 994 380 568
              </a>
              <p className="mt-1 text-muted-foreground">Rédaction</p>
              <p className="font-semibold">Goma · Bukavu · Bunia · Kinshasa</p>
            </div>
            <p className="mt-3 font-sans text-base leading-[1.7] text-foreground sm:text-sm sm:leading-relaxed">
              Une information à nous transmettre, un partenariat ou un droit de réponse ? Notre
              équipe s'engage à répondre dans les meilleurs délais.
            </p>
          </div>
        </div>


        <div className="rule-top mt-8 flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="font-sans text-xs text-muted-foreground">
            © {new Date().getUTCFullYear()} ReelActu — Tous droits réservés.
          </p>
          <p className="flex flex-wrap items-center gap-3 font-sans text-xs text-muted-foreground">
            <span>Goma · Bukavu · Bunia · Kinshasa</span>
            <Link to="/a-propos" className="hover:text-foreground">
              À propos
            </Link>
            <a href="mailto:info@reelactu.com" className="hover:text-foreground">
              Contact
            </a>
            <Link to="/auth" className="hover:text-foreground">
              Espace rédaction
            </Link>
          </p>

        </div>
      </div>
    </footer>
  );
}
