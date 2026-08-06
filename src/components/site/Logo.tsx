import { Link } from "@tanstack/react-router";

/**
 * Variantes officielles de la charte ReelActu :
 * - `couleur`   : encre (adaptée au thème) + point signal rouge — usage principal
 * - `blanc`     : logotype blanc + point signal rouge — sur fond sombre/photo
 * - `monochrome`: tout en une seule encre (impression, fax, gravure)
 */
export type LogoVariant = "couleur" | "blanc" | "monochrome";

const MARK_INK: Record<LogoVariant, string> = {
  couleur: "text-foreground",
  blanc: "text-signal-foreground",
  monochrome: "text-current",
};

const DOT_FILL: Record<LogoVariant, string> = {
  couleur: "fill-signal",
  blanc: "fill-signal",
  monochrome: "fill-current",
};

type LogoMarkProps = {
  className?: string;
  variant?: LogoVariant;
  /** Surcharge ponctuelle de la couleur du point signal. */
  accentClassName?: string;
};

/** Monogramme ReelActu : cadre carré, R éditorial, point signal. */
export function LogoMark({
  className = "size-9",
  variant = "couleur",
  accentClassName,
}: LogoMarkProps) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="ReelActu" className={className} fill="none">
      <rect x="2" y="2" width="60" height="60" stroke="currentColor" strokeWidth="4" />
      <text
        x="34"
        y="46"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="var(--font-sans, ui-sans-serif)"
        fontSize="42"
        fontWeight="800"
        letterSpacing="-1"
      >
        R
      </text>
      <circle cx="17" cy="43" r="6" className={accentClassName ?? DOT_FILL[variant]} />
    </svg>
  );
}

type LogoProps = {
  /** Affiche la baseline sous le logotype. */
  withBaseline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: LogoVariant;
  /** Disposition verticale (mark au-dessus du logotype). */
  orientation?: "horizontal" | "vertical";
};

const WORDMARK_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-[2rem]",
};

const MARK_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "size-7",
  md: "size-9",
  lg: "size-11",
  xl: "size-14",
};

export function Logo({
  withBaseline = false,
  className = "",
  size = "md",
  variant = "couleur",
  orientation = "horizontal",
}: LogoProps) {
  const vertical = orientation === "vertical";

  return (
    <span
      className={`flex ${vertical ? "flex-col items-center gap-2 text-center" : "items-center gap-2.5"} ${MARK_INK[variant]} ${className}`}
    >
      <LogoMark className={MARK_SIZE[size]} variant={variant} />
      <span className="flex flex-col leading-none">
        <span className={`font-sans font-extrabold tracking-tight ${WORDMARK_SIZE[size]}`}>
          ReelActu
        </span>
        {withBaseline ? (
          <span
            className={`mt-1 font-sans text-[0.55rem] font-semibold tracking-[0.22em] uppercase ${
              variant === "couleur" ? "text-muted-foreground" : "opacity-80"
            }`}
          >
            L'information Réelle
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function LogoLink(props: LogoProps) {
  return (
    <Link to="/" aria-label="ReelActu — L'information Réelle" className="shrink-0">
      <Logo {...props} />
    </Link>
  );
}
