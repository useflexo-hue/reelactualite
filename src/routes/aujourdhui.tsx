import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { fr as rdpFr } from "react-day-picker/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { getArticlesByDate } from "@/lib/today.functions";
import type { ArticleCardData } from "@/lib/news-types";
import { absUrl, SITE_NAME } from "@/lib/site";
import { ArticleCard } from "@/components/site/ArticleCard";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TodayData = {
  date: string;
  articles: ArticleCardData[];
};

function parseDateParam(raw: unknown): string {
  const str = typeof raw === "string" ? raw.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return new Date().toISOString().slice(0, 10);
}

export const Route = createFileRoute("/aujourdhui")({
  validateSearch: (search: Record<string, unknown>) => {
    const date = parseDateParam(search.date);
    return { date };
  },
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ deps }) => {
    return (await getArticlesByDate({ data: { date: deps.date } })) as TodayData;
  },
  head: ({ loaderData }) => {
    const data = loaderData as TodayData | undefined;
    const date = data?.date ?? new Date().toISOString().slice(0, 10);
    const formatted = format(parseISO(date), "d MMMM yyyy", { locale: fr });
    const title = `Actualité du ${formatted} — ${SITE_NAME}`;
    const description = `Retrouvez toute l'actualité publiée le ${formatted} par la rédaction de ${SITE_NAME}.`;
    const url = absUrl(`/aujourdhui?date=${date}`);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TodayPage,
});

function TodayPage() {
  const { date, articles } = Route.useLoaderData() as TodayData;
  const navigate = Route.useNavigate();
  const selected = parseISO(date);

  const changeDate = (next: Date) => {
    const iso = next.toISOString().slice(0, 10);
    navigate({ to: "/aujourdhui", search: { date: iso } });
  };

  const prevDay = new Date(selected);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(selected);
  nextDay.setDate(nextDay.getDate() + 1);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <header className="rule-heavy pb-4">
        <p className="kicker-muted">Calendrier éditorial</p>
        <h1 className="mt-1 text-2xl sm:text-3xl">
          Actualité du{" "}
          <span className="text-signal">{format(selected, "d MMMM yyyy", { locale: fr })}</span>
        </h1>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Calendrier éditorial */}
        <aside className="shrink-0 lg:w-80">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-card-foreground">
                Choisir un jour
              </h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <CalendarIcon className="size-4" />
                    <span className="hidden sm:inline">Calendrier</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(d) => d && changeDate(d)}
                    initialFocus
                    locale={rdpFr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && changeDate(d)}
              locale={rdpFr}
              className="pointer-events-auto"
            />

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <Link
                to="/aujourdhui"
                search={{ date: prevDay.toISOString().slice(0, 10) }}
                className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-signal hover:underline"
              >
                <ChevronLeft className="size-4" />
                Hier
              </Link>
              <Link
                to="/aujourdhui"
                search={{ date: nextDay.toISOString().slice(0, 10) }}
                className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-signal hover:underline"
              >
                Demain
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Liste des articles */}
        <section className="min-w-0 flex-1">
          {articles.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="font-sans text-sm text-muted-foreground">
                Aucun article publié le{" "}
                <span className="font-semibold text-foreground">
                  {format(selected, "d MMMM yyyy", { locale: fr })}
                </span>
                .
              </p>
              <Link
                to="/"
                className="mt-4 inline-block font-sans text-sm font-semibold text-signal hover:underline"
              >
                Retour à la une →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="font-sans text-sm text-muted-foreground">
                {articles.length} article{articles.length > 1 ? "s" : ""} publié
                {articles.length > 1 ? "s" : ""} ce jour.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {articles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
