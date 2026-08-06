import { useEffect, useState } from "react";
import { Facebook, Link2, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { trackShare } from "@/lib/share-analytics.functions";

const SITE_URL = "https://reelactu-afrique-prime.lovable.app";

type Props = {
  slug: string;
  title: string;
  /** URL absolue de l'image de couverture (utilisée par Facebook/X via les balises og). */
  imageUrl?: string | null;
};

/** Icône X (Twitter) — non fournie par lucide. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2m0 1.8c2.16 0 4.19.84 5.72 2.37a8.03 8.03 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.06.8.82-2.99-.19-.31a8.03 8.03 0 0 1-1.24-4.3c0-4.46 3.63-8.07 8.1-8.07m-3.5 4.06c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.9 2.4 1.02 2.57c.12.16 1.74 2.78 4.28 3.79 2.11.83 2.54.67 3 .62.46-.04 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.29-.25-.12-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.12-.17.25-.64.81-.79.98-.14.16-.29.19-.54.06-.25-.12-1.06-.39-2.01-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.55-1.35-.76-1.85-.2-.48-.4-.41-.55-.42z" />
    </svg>
  );
}

export function ShareBar({ slug, title, imageUrl }: Props) {
  const [url, setUrl] = useState(`${SITE_URL}/${slug}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setUrl(window.location.href);
  }, [slug]);

  const track = (network: string) => {
    void trackShare({
      data: {
        slug,
        network,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      },
    }).catch(() => {});
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      key: "facebook",
      label: "Partager sur Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="h-4 w-4" aria-hidden />,
    },
    {
      key: "x",
      label: "Partager sur X",
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=ReelActu`,
      icon: <XIcon className="h-4 w-4" />,
    },
    {
      key: "whatsapp",
      label: "Partager sur WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      icon: <WhatsAppIcon className="h-4 w-4" />,
    },
    {
      key: "telegram",
      label: "Partager sur Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Send className="h-4 w-4" aria-hidden />,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("copy_link");
      setCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 font-sans">
      <span className="mr-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Partager
      </span>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          data-image={imageUrl ?? undefined}
          onClick={() => track(l.key)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-rule text-muted-foreground transition-colors hover:border-signal hover:bg-signal hover:text-signal-foreground"
        >
          {l.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copier le lien de l'article"
        title="Copier le lien"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-rule text-muted-foreground transition-colors hover:border-signal hover:bg-signal hover:text-signal-foreground"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
