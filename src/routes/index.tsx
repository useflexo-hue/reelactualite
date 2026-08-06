import { createFileRoute, Link } from "@tanstack/react-router";
import { getHomeData } from "@/lib/news.functions";
import type { HomeData } from "@/lib/news-types";
import { ArticleCard } from "@/components/site/ArticleCard";
import { BreakingBanner } from "@/components/site/BreakingBanner";
import { Newsletter } from "@/components/site/Newsletter";
import { absUrl, SITE_URL } from "@/lib/site";

const EMPTY_HOME: HomeData = {
  categories: [],
  breaking: null,
  featured: [],
  latest: [],
  mostRead: [],
  mostShared: [],
  sections: [],
};

/**
 * Réseau instable : on réessaie avant d'abandonner, et on rend une page vide
 * plutôt que de faire tomber la route dans l'écran d'erreur.
 */
async function loadHomeData(): Promise<HomeData> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getHomeData();
    } catch (error) {
      if (attempt === 2) {
        console.error("getHomeData failed", error);
        return EMPTY_HOME;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return EMPTY_HOME;
}

export const Route = createFileRoute("/")({
  loader: () => loadHomeData(),

  head: () => ({
    meta: [
      { title: "ReelActu — Actualité RDC, Nord-Kivu, Ituri, Afrique et Monde" },
      {
        name: "description",
        content:
          "Toute l'actualité vérifiée de la RDC : Nord-Kivu, Sud-Kivu, Ituri, politique, sécurité, économie, santé, justice. Reportages, investigations et analyses de ReelActu.",
      },
      { property: "og:title", content: "ReelActu — L'information de la RDC et des Grands Lacs" },
      {
        property: "og:description",
        content:
          "Reportages de terrain, investigations et analyses depuis Goma, Bukavu, Bunia et Kinshasa.",
      },
      { property: "og:url", content: absUrl("/") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ReelActu",
          url: SITE_URL,
          inLanguage: "fr",
        }),
      },
    ],
  }),
  component: Home,
});


function SectionTitle({ title, slug }: { title: string; slug?: string }) {
  return (
    <div className="rule-heavy mb-4 flex items-baseline justify-between pt-2">
      <h2 className="py-1 text-lg font-bold tracking-tight">{title}</h2>
      {slug ? (
        <Link
          to="/category/$slug"
          params={{ slug }}
          className="font-sans text-xs font-medium text-signal hover:underline"
        >
          Tout voir
        </Link>
      ) : null}
    </div>
  );
}

function Home() {
  const data = Route.useLoaderData() as HomeData;
  const [lead, ...secondary] = data.featured;
  const tickerLead = data.breaking ?? data.latest[0] ?? null;

  return (
    <>
      {tickerLead ? (
        <BreakingBanner article={tickerLead} items={data.latest.slice(0, 8)} />
      ) : null}

      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <h1 className="sr-only">
          ReelActu — l'information réelle en République démocratique du Congo et en Afrique
        </h1>
        {/* À la Une */}
        <section aria-label="À la Une" className="grid gap-8 lg:grid-cols-[1fr_320px]">

          <div>
            {lead ? <ArticleCard article={lead} variant="lead" priority /> : null}
            {secondary.length ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                {secondary.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            ) : null}
          </div>

          {/* Colonne latérale : dernière minute */}
          <aside className="lg:border-l lg:border-rule lg:pl-6">
            <SectionTitle title="Dernière minute" />
            <div>
              {data.latest.slice(0, 8).map((a) => (
                <ArticleCard key={a.slug} article={a} variant="list" />
              ))}
            </div>
          </aside>
        </section>

        {/* Bandes rubriques */}
        {data.sections.map((section) => (
          <section key={section.slug} className="mt-12" aria-label={section.name}>
            <SectionTitle title={section.name} slug={section.slug} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.articles.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        ))}

        {/* Les plus lus / partagés */}
        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle title="Les plus lus" />
            <ol className="space-y-0">
              {data.mostRead.map((a, i) => (
                <li key={a.slug} className="rule-top flex gap-4 py-3">
                  <span className="font-display text-2xl leading-none font-bold text-rule">
                    {i + 1}
                  </span>
                  <Link
                    to="/$slug"
                    params={{ slug: a.slug }}
                    className="headline-link text-[0.95rem] leading-snug font-semibold"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <SectionTitle title="Les plus partagés" />
            <ol className="space-y-0">
              {data.mostShared.map((a, i) => (
                <li key={a.slug} className="rule-top flex gap-4 py-3">
                  <span className="font-display text-2xl leading-none font-bold text-rule">
                    {i + 1}
                  </span>
                  <Link
                    to="/$slug"
                    params={{ slug: a.slug }}
                    className="headline-link text-[0.95rem] leading-snug font-semibold"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Newsletter />
      </div>
    </>
  );
}
