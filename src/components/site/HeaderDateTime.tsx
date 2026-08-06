import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const formatterDateLong = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatterDateShort = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const formatterTime = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function HeaderDateTime({ className }: { className?: string }) {
  // Render the current date server-side to avoid an empty placeholder;
  // the time updates client-side after hydration.
  const [now, setNow] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todayIso = now.toISOString().slice(0, 10);

  return (
    <Link
      to="/aujourdhui"
      search={{ date: todayIso }}
      aria-label="Voir l'actualité du jour et le calendrier éditorial"
      className="block rounded-sm transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      <time
        dateTime={now.toISOString()}
        suppressHydrationWarning
        className={`min-w-[6rem] text-center font-sans text-[0.7rem] font-semibold tabular-nums leading-tight whitespace-nowrap text-signal sm:text-sm md:text-base ${className ?? ""}`}
      >
        <span className="hidden capitalize sm:block" suppressHydrationWarning>
          {formatterDateLong.format(now)}
        </span>
        <span className="block capitalize sm:hidden" suppressHydrationWarning>
          {formatterDateShort.format(now)}
        </span>
        <span className={`block ${mounted ? "" : "opacity-60"}`} suppressHydrationWarning>
          {mounted ? formatterTime.format(now) : "--:--"}
        </span>
      </time>
    </Link>
  );
}
