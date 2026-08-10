import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getArticle, type ArticleNeighbor } from "@/lib/news.functions";
import type { ArticleCardData, ArticleFull } from "@/lib/news-types";
import { ArticleCard } from "@/components/site/ArticleCard";
import { formatDateTime, isoDate } from "@/lib/format";
import { AuthorByline, xHandle } from "@/components/site/AuthorByline";
import { ArticleBody } from "@/components/site/ArticleBody";
import { ArticleTranslate } from "@/components/site/ArticleTranslate";
import { ShareBar } from "@/components/site/ShareBar";
import { SmartImage } from "@/components/site/SmartImage";
import { absUrl } from "@/lib/site";



import type { TranslateResult } from "@/lib/translate.functions";


export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const res = (await getArticle({ data: { slug: params.slug } })) as {
      article: ArticleFull | null;
      related: ArticleCardData[];
      prev: ArticleNeighbor;
      next: ArticleNeighbor;
    };
    if (!res.article) throw notFound();
    return res;
  },

  head: ({ params, loaderData }) => {
    const data = loaderData as { article: ArticleFull } | undefined;
    if (!data?.article) {
      return {
        meta: [{ title: "Article introuvable — ReelActu" }, { name: "robots", content: "noindex" }],
      };
    }
    const a = data.article;
    const title = a.seo_title ?? `${a.title} — ReelActu`;
    const description = a.seo_description ?? a.dek ?? a.title;
    const url = absUrl(`/${params.slug}`);
    const image = a.cover_url ? absUrl(a.cover_url) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: a.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(a.published_at
          ? [{ property: "article:published_time", content: isoDate(a.published_at) }]
          : []),
        ...(a.category?.name ? [{ property: "article:section", content: a.category.name }] : []),
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: a.title,
            description,
            url,
            ...(a.published_at
              ? {
                  datePublished: isoDate(a.published_at),
                  dateModified: isoDate(a.published_at),
                }
              : {}),
            inLanguage: "fr",
            articleSection: a.category?.name,
            ...(image ? { image: [image] } : {}),
            author: a.author?.display_name
              ? [a.author, ...(a.coAuthors ?? [])].map((p) => ({
                  "@type": "Person",
                  name: p.display_name,
                  ...(xHandle(p) ? { sameAs: [`https://x.com/${xHandle(p)}`] } : {}),
                }))
              : undefined,

            publisher: {
              "@type": "NewsMediaOrganization",
              name: "ReelActu",
              logo: {
                "@type": "ImageObject",
                url: absUrl("/images/logo-reelactu.png"),
              },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          }),
        },
        ...(a.category
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Accueil", item: absUrl("/") },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: a.category.name,
                      item: absUrl(`/category/${a.category.slug}`),
                    },
                    { "@type": "ListItem", position: 3, name: a.title, item: url },
                  ],
                }),
              },
            ]
          : []),
      ],
    };
  },

  notFoundComponent: ArticleNotFound,
  errorComponent: ArticleNotFound,
  component: ArticlePage,
});

function ArticleNotFound() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-24 text-center">
      <p className="kicker">Erreur 404</p>
      <h1 className="mt-2 text-3xl">Cet article n'est pas disponible</h1>
      <p className="mt-3 font-sans text-sm text-muted-foreground">
        Il a peut-être été déplacé ou dépublié.
      </p>
      <Link to="/" className="mt-6 inline-block font-sans text-sm font-semibold text-signal">
        Retour à la une
      </Link>
    </div>
  );
}

function ArticlePage() {
  const { article, related, prev, next } = Route.useLoaderData() as {
    article: ArticleFull;
    related: ArticleCardData[];
    prev: ArticleNeighbor;
    next: ArticleNeighbor;
  };

  const [lang, setLang] = useState("fr");
  const [translated, setTranslated] = useState<TranslateResult | null>(null);

  const title = translated?.title ?? article.title;
  const dek = translated ? translated.dek : article.dek;
  const body = translated?.body ?? article.body ?? "";

  return (
    <article className="mx-auto max-w-[1200px] px-4 py-8" lang={lang}>
      <nav
        aria-label="Article précédent et suivant"
        className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3 font-sans text-xs"
      >
        {prev ? (
          <Link
            to="/$slug"
            params={{ slug: prev.slug }}
            className="group flex min-w-0 items-center gap-2 font-semibold text-foreground hover:text-signal"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-signal group-hover:text-signal">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Précédent
              </span>
              <span className="block truncate max-w-[200px] sm:max-w-[320px]">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span aria-hidden />
        )}
        {next ? (
          <Link
            to="/$slug"
            params={{ slug: next.slug }}
            className="group flex min-w-0 items-center gap-2 text-right font-semibold text-foreground hover:text-signal"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Suivant
              </span>
              <span className="block truncate max-w-[200px] sm:max-w-[320px]">{next.title}</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-signal group-hover:text-signal">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        ) : (
          <span aria-hidden />
        )}
      </nav>

      <nav aria-label="Fil d'Ariane" className="mb-4 font-sans text-xs text-muted-foreground">

        <Link to="/" className="hover:text-signal">
          Accueil
        </Link>
        {article.category ? (
          <>
            <span className="px-1.5">/</span>
            <Link
              to="/category/$slug"
              params={{ slug: article.category.slug }}
              className="hover:text-signal"
            >
              {article.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,680px)_1fr]">
        <div>
          <header>
            {article.is_breaking ? (
              <span className="mb-2 inline-block bg-signal px-2 py-0.5 font-sans text-[0.65rem] font-bold tracking-[0.14em] text-signal-foreground uppercase">
                Dernière minute
              </span>
            ) : null}
            <span className="kicker block">{article.category?.name ?? "Actualités"}</span>
            <h1 className="mt-2 text-[2rem] leading-[1.1] md:text-[2.6rem]">{title}</h1>
            {dek ? (
              <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">{dek}</p>
            ) : null}
            <div className="rule-top mt-5 pt-4">
              <AuthorByline author={article.author} coAuthors={article.coAuthors} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-muted-foreground">
              <time dateTime={isoDate(article.published_at)}>
                {formatDateTime(article.published_at)}
              </time>
              {article.location ? <span>{article.location}</span> : null}
              <span>{article.reading_minutes} min de lecture</span>
            </div>
            <div className="rule-top mt-4 pt-3">
              <ArticleTranslate
                slug={article.slug}
                title={article.title}
                dek={article.dek}
                body={article.body ?? ""}
                onTranslated={(nextLang, data) => {
                  setLang(nextLang);
                  setTranslated(data);
                }}
              />
            </div>
          </header>


          {article.cover_url ? (
            <figure className="mt-6">
              <SmartImage
                src={article.cover_url}
                alt={article.title}
                width={1600}
                height={900}
                priority
                sizes="(max-width: 768px) 100vw, 900px"
                className="aspect-[16/9] w-full object-cover"
              />

              {article.cover_credit ? (
                <figcaption className="mt-1.5 font-sans text-xs text-muted-foreground">
                  {article.cover_credit}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="prose-article mt-8">
            <ArticleBody body={body} />
          </div>

          {article.tags?.length ? (
            <div className="rule-top mt-8 flex flex-wrap gap-2 pt-4">
              {article.tags.map((t) => (
                <span
                  key={t.slug}
                  className="border border-rule px-2 py-1 font-sans text-xs text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : null}

          {article.author?.bio ? (
            <aside className="mt-8 border-l-2 border-signal bg-secondary px-4 py-4">
              <p className="font-sans text-sm font-semibold">{article.author.display_name}</p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">
                {article.author.bio}
              </p>
            </aside>
          ) : null}

          <div className="rule-top mt-8 pt-5">
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Partager cet article
            </p>
            <ShareBar slug={article.slug} title={article.title} imageUrl={article.cover_url} />
          </div>
        </div>

        <aside className="lg:border-l lg:border-rule lg:pl-8">
          <div className="rule-heavy mb-4 pt-2">
            <h2 className="py-1 text-lg font-bold">À lire aussi</h2>
          </div>
          {related.map((a) => (
            <ArticleCard key={a.slug} article={a} variant="compact" />
          ))}
        </aside>
      </div>
    </article>
  );
}
