import { Link } from "@tanstack/react-router";
import type { ArticleCardData } from "@/lib/news-types";
import { formatDateTime } from "@/lib/format";
import { SmartImage } from "@/components/site/SmartImage";


type Variant = "lead" | "standard" | "compact" | "list";

export function ArticleCard({
  article,
  variant = "standard",
  priority = false,
}: {
  article: ArticleCardData;
  variant?: Variant;
  priority?: boolean;
}) {
  const kicker = article.category?.name ?? "Actualités";

  if (variant === "list") {
    return (
      <article className="rule-top py-3">
        <Link
          to="/$slug"
          params={{ slug: article.slug }}
          className="headline-link group flex gap-3"
        >
          <time className="w-14 shrink-0 pt-1 font-sans text-xs tabular-nums text-muted-foreground">
            {formatDateTime(article.published_at, "time")}
          </time>
          <h3 className="text-[0.95rem] leading-snug font-semibold">{article.title}</h3>
        </Link>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="rule-top py-4">
        <Link to="/$slug" params={{ slug: article.slug }} className="headline-link">
          <span className="kicker">{kicker}</span>
          <h3 className="mt-1 text-lg leading-tight">{article.title}</h3>
        </Link>
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          {formatDateTime(article.published_at)}
          {article.location ? ` · ${article.location}` : ""}
        </p>
      </article>
    );
  }

  const isLead = variant === "lead";

  return (
    <article className={isLead ? "" : "rule-top pt-4"}>
      <Link to="/$slug" params={{ slug: article.slug }} className="headline-link group">
        {article.cover_url ? (
          <div className="mb-3 overflow-hidden bg-muted">
            <SmartImage
              src={article.cover_url}
              alt={article.title}
              width={isLead ? 1600 : 1200}
              height={isLead ? 900 : 800}
              priority={priority}
              sizes={isLead ? "(max-width: 768px) 100vw, 900px" : "(max-width: 768px) 100vw, 500px"}
              className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}

        <span className="kicker">{kicker}</span>
        <h2
          className={
            isLead
              ? "mt-2 text-3xl leading-[1.08] md:text-[2.75rem]"
              : "mt-1.5 text-xl leading-tight"
          }
        >
          {article.title}
        </h2>
      </Link>
      {article.dek ? (
        <p
          className={
            isLead
              ? "mt-3 max-w-2xl font-sans text-base leading-relaxed text-muted-foreground"
              : "mt-2 font-sans text-sm leading-relaxed text-muted-foreground"
          }
        >
          {article.dek}
        </p>
      ) : null}
      <p className="mt-2.5 font-sans text-xs text-muted-foreground">
        {article.author?.display_name ? `${article.author.display_name} · ` : ""}
        {formatDateTime(article.published_at)}
        {article.location ? ` · ${article.location}` : ""}
        {` · ${article.reading_minutes} min`}
      </p>
    </article>
  );
}
