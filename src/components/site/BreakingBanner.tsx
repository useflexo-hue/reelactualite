import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { ArticleCardData } from "@/lib/news-types";
import {
  DIRECT_REFRESH_MS,
  logDirect,
  minutesSince,
  severityFor,
} from "@/lib/direct-monitor";

async function sendAlert(payload: Record<string, unknown>) {
  try {
    await fetch("/api/public/direct-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, path: window.location.pathname }),
      keepalive: true,
    });
  } catch {
    /* le diagnostic ne doit jamais casser l'affichage */
  }
}

export function BreakingBanner({
  article,
  items = [],
}: {
  article: ArticleCardData;
  items?: ArticleCardData[];
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const alertedRef = useRef<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  const seen = new Set<string>();
  const feed = [article, ...items].filter((a) => {
    if (!a || seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
  const loop = feed.length > 1 ? [...feed, ...feed] : feed;
  const newestIso = feed[0]?.published_at ?? null;

  // 1. Rafraîchissement automatique du fil (onglet visible uniquement).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.invalidate();
      setRefreshedAt(Date.now());
    };
    const id = window.setInterval(tick, DIRECT_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  // 2. Diagnostic : fraîcheur du contenu + animation réellement active.
  useEffect(() => {
    const ageMinutes = minutesSince(newestIso);
    const severity = severityFor(ageMinutes, feed.length);
    const animated =
      feed.length <= 1 ||
      (trackRef.current
        ? window.getComputedStyle(trackRef.current).animationName !== "none"
        : false);

    logDirect(severity === "ok" && animated ? "info" : "warn", "ticker_render", {
      severity,
      items: feed.length,
      age_minutes: ageMinutes,
      animated,
      refreshed_at: refreshedAt,
    });

    const reason = !animated
      ? "animation_stopped"
      : severity !== "ok"
        ? `content_${severity}`
        : null;

    if (reason && alertedRef.current !== reason) {
      alertedRef.current = reason;
      void sendAlert({ reason, ageMinutes, items: feed.length, animated });
    }
    if (!reason) alertedRef.current = null;
  }, [newestIso, feed.length, refreshedAt]);

  return (
    <div className="bg-brand-blue text-brand-blue-foreground" data-direct-items={feed.length}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2">
        <span className="flex shrink-0 items-center gap-2 font-sans text-[0.65rem] font-bold tracking-[0.16em] uppercase">
          <span className="ticker-dot" aria-hidden />
          Dernière minute
        </span>
        <span className="h-4 w-px shrink-0 bg-current/40" aria-hidden />
        <div className="ticker-window min-w-0 flex-1">
          <div ref={trackRef} className={feed.length > 1 ? "ticker-track" : ""}>
            {loop.map((a, i) => (
              <Link
                key={`${a.slug}-${i}`}
                to="/$slug"
                params={{ slug: a.slug }}
                className="ticker-item font-sans text-sm font-medium hover:underline"
              >
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
