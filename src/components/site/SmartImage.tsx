import { useState } from "react";
import { buildSrcSet, IMAGE_FALLBACK, normalizeImageUrl, sizedUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Image universelle du site : accepte tous les formats (JPEG, PNG, WebP, AVIF,
 * GIF, SVG, TIFF, HEIC converti à l'upload), génère un srcSet responsive pour
 * les médias internes, charge en différé et bascule sur un visuel de secours
 * si le fichier distant est indisponible.
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  className,
  sizes = "(max-width: 768px) 100vw, 800px",
  priority = false,
}: Props) {
  const normalized = normalizeImageUrl(src);
  const [failed, setFailed] = useState(false);

  const url = !normalized || failed ? IMAGE_FALLBACK : sizedUrl(normalized, width);
  const srcSet = !normalized || failed ? null : buildSrcSet(normalized, width);

  return (
    <img
      src={url}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      className={cn("bg-muted", className)}
    />
  );
}
