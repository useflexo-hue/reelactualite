import { Facebook, Instagram, Linkedin, Music2, Youtube } from "lucide-react";
import type { ComponentType } from "react";
import { SOCIALS, type SocialPlatform } from "@/lib/social";
import { cn } from "@/lib/utils";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.5l-5.1-6.6L5.8 22H2.7l7.6-8.7L1.2 2h6.6l4.6 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
    </svg>
  );
}

const ICONS: Record<SocialPlatform, ComponentType<{ className?: string }>> = {
  x: XIcon,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Music2,
};

export function SocialLinks({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {SOCIALS.map((s) => {
        const Icon = ICONS[s.id];
        return (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`ReelActu sur ${s.name} (${s.handle})`}
              title={`${s.name} — ${s.handle}`}
              className={cn(
                "flex items-center justify-center rounded-full border border-rule bg-background text-foreground transition-colors hover:border-signal hover:bg-signal hover:text-signal-foreground",
                size === "sm" ? "size-9" : "size-11",
              )}
            >
              <Icon className={size === "sm" ? "size-4" : "size-[1.15rem]"} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
