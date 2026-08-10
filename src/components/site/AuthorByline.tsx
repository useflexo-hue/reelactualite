import { SmartImage } from "@/components/site/SmartImage";

type BylineAuthor = {

  slug: string;
  display_name: string;
  role_label?: string | null;
  avatar_url?: string | null;
  twitter?: string | null;
};

const FALLBACK_HANDLE = "reelactu";

export function xHandle(author: BylineAuthor | null | undefined): string {
  const raw = (author?.twitter ?? "").trim();
  if (!raw) return FALLBACK_HANDLE;
  if (raw.startsWith("http")) {
    const last = raw.replace(/\/+$/, "").split("/").pop() ?? "";
    return last.replace(/^@/, "") || FALLBACK_HANDLE;
  }
  return raw.replace(/^@/, "");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.96 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.72 6.24 5.44-6.24Zm-1.16 17.52h1.83L7.02 4.13H5.05l12.03 15.64Z" />
    </svg>
  );
}

export function AuthorByline({
  author,
  coAuthors,
  size = "default",
}: {
  author: BylineAuthor | null | undefined;
  coAuthors?: { display_name: string }[];
  size?: "default" | "compact";
}) {
  if (!author) return null;
  const handle = xHandle(author);
  const isCompact = size === "compact";
  const bylineNames = [author.display_name, ...(coAuthors ?? []).map((c) => c.display_name)].join(
    " et ",
  );

  return (
    <div className="flex items-center gap-3">
      {author.avatar_url ? (
        <SmartImage
          src={author.avatar_url}
          alt={author.display_name}
          width={96}
          height={96}
          sizes="96px"
          className={`${isCompact ? "size-9" : "size-12"} shrink-0 rounded-full border border-rule object-cover`}
        />

      ) : (
        <span
          className={`${isCompact ? "size-9 text-xs" : "size-12 text-sm"} flex shrink-0 items-center justify-center rounded-full bg-secondary font-sans font-bold text-muted-foreground`}
          aria-hidden="true"
        >
          {initials(author.display_name)}
        </span>
      )}

      <div className="min-w-0 font-sans">
        <p className="truncate text-sm font-semibold text-foreground">
          Par {bylineNames}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {author.role_label ? <span className="truncate">{author.role_label}</span> : null}
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-signal"
            aria-label={`Compte X de ${author.display_name}`}
          >
            <XIcon className="size-3" />
            <span>@{handle}</span>
          </a>
        </div>
      </div>

      <a
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="ml-auto inline-flex items-center gap-1.5 border border-rule px-2.5 py-1 font-sans text-xs font-semibold transition-colors hover:border-signal hover:text-signal"
      >
        <XIcon className="size-3" />
        Suivre
      </a>
    </div>
  );
}
