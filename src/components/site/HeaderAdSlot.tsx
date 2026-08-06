import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_HEADER_SPONSORS, SPONSOR_ROTATION_MS } from "@/lib/ads";
import { getHeaderSponsors } from "@/lib/ads.functions";
import { cn } from "@/lib/utils";

/**
 * Encart sponsorisé du bandeau : forme ovale horizontale, rotation douce
 * entre les annonceurs. Les annonces sont gérées depuis l'espace de rédaction.
 * Le lien porte rel="sponsored" pour le référencement.
 *
 * Thèmes :
 * - "signal" : fond rouge ReelActu (défaut, intégré au bandeau rouge)
 * - "brand-blue" : fond bleu marine (intégré au bandeau supérieur bleu)
 */
export function HeaderAdSlot({
  className,
  theme = "signal",
}: {
  className?: string;
  theme?: "signal" | "brand-blue";
}) {
  const { data } = useQuery({
    queryKey: ["header-sponsors"],
    queryFn: () => getHeaderSponsors({ data: {} }),
    staleTime: 60 * 1000,
    // placeholderData (et non initialData) : les encarts de secours s'affichent
    // immédiatement mais la vraie liste est bien récupérée depuis la base.
    placeholderData: DEFAULT_HEADER_SPONSORS,
  });
  const sponsors = data ?? [];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setIndex(0);
    if (sponsors.length < 2) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % sponsors.length);
        setVisible(true);
      }, 320);
    }, SPONSOR_ROTATION_MS);
    return () => window.clearInterval(id);
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;
  const sponsor = sponsors[index % sponsors.length]!;

  const isBlue = theme === "brand-blue";
  const fg = isBlue ? "text-brand-blue-foreground" : "text-signal-foreground";
  const fgMuted = isBlue
    ? "text-brand-blue-foreground/70"
    : "text-signal-foreground/70";
  const fgSoft = isBlue
    ? "text-brand-blue-foreground/80"
    : "text-signal-foreground/80";
  const border = isBlue
    ? "border-brand-blue-foreground/25 hover:border-brand-blue-foreground/50"
    : "border-signal-foreground/25 hover:border-signal-foreground/50";
  const bgHover = isBlue
    ? "hover:bg-brand-blue-foreground/10"
    : "hover:bg-signal-foreground/15";
  const logoBg = isBlue
    ? "bg-brand-blue-foreground/90"
    : "bg-signal-foreground/90";

  return (
    <aside
      aria-label="Espace publicitaire sponsorisé"
      className={cn("min-w-0 shrink", className)}
    >
      <a
        href={sponsor.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={cn(
          "group flex min-w-0 items-center gap-2.5 rounded-full border px-4 py-2 transition-colors",
          border,
          bgHover,
        )}
      >
        {sponsor.media_url && sponsor.media_type === "image" ? (
          <img
            src={sponsor.media_url}
            alt=""
            aria-hidden
            className="h-9 w-14 shrink-0 rounded-md object-cover"
          />
        ) : sponsor.media_url && sponsor.media_type === "video" ? (
          <video
            src={sponsor.media_url}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="h-9 w-14 shrink-0 rounded-md object-cover"
          />
        ) : sponsor.media_url && sponsor.media_type === "audio" ? (
          <span
            aria-hidden
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full",
              logoBg,
            )}
          >
            <Volume2 className={cn("size-4", isBlue ? "text-brand-blue" : "text-signal")} />
          </span>
        ) : sponsor.logo ? (
          <img
            src={sponsor.logo}
            alt=""
            aria-hidden
            className={cn(
              "size-7 shrink-0 rounded-full object-contain p-0.5",
              logoBg,
            )}
          />
        ) : null}
        <span
          className={cn(
            "flex min-w-0 flex-col leading-tight transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          <span className={cn("truncate font-sans text-[0.8rem] font-bold tracking-tight", fg)}>
            {sponsor.name}
          </span>
          <span className={cn("truncate font-sans text-[0.68rem]", fgSoft)}>
            {sponsor.claim}
          </span>
        </span>
      </a>
    </aside>
  );
}
