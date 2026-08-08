import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mediaUrl } from "@/lib/image";
import { uuid } from "@/lib/utils";
import type { SponsorMediaType } from "@/lib/ads";

const MAX_EDGE = 1600;
const MAX_BYTES = 50 * 1024 * 1024;

export const MEDIA_ACCEPT_ATTR = "image/*,video/*,audio/*";

/** Détecte la famille de média à partir du fichier. */
function detectType(file: File): SponsorMediaType | null {
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif|bmp|tiff?|hei[cf]|svg)$/i.test(file.name))
    return "image";
  if (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) return "video";
  if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) return "audio";
  return null;
}

/** Convertit une image (HEIC/TIFF inclus) en WebP optimisé. */
async function processImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    return { blob: file, ext: "svg" };
  }
  let source: Blob = file;
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(out) ? out[0]! : (out as Blob);
  }
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (blob) return { blob, ext: "webp" };
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!jpeg) throw new Error("Conversion impossible");
  return { blob: jpeg, ext: "jpg" };
}

/**
 * Import universel d'un média publicitaire : photo, vidéo ou audio.
 * Les photos sont converties/redimensionnées, les vidéos et sons sont
 * envoyés tels quels dans le stockage média du site.
 */
export function MediaUploader({
  value,
  type,
  onChange,
  label = "Importer un média",
}: {
  value: string;
  type?: SponsorMediaType;
  onChange: (media: { url: string; type: SponsorMediaType } | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const kind = detectType(file);
    if (!kind) {
      toast.error("Format non pris en charge (photo, vidéo ou audio attendu).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop lourd (50 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      let blob: Blob = file;
      let ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      if (kind === "image") {
        const out = await processImage(file);
        blob = out.blob;
        ext = out.ext;
      }
      const path = `publicite/${new Date().getFullYear()}/${uuid()}.${ext}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, blob, {
          contentType: blob.type || file.type || "application/octet-stream",
          upsert: false,
        });
      if (error) throw error;
      onChange({ url: mediaUrl(path), type: kind });
      toast.success("Média importé");
    } catch (err) {
      toast.error(
        `Import impossible : ${err instanceof Error ? err.message : "format non reconnu"}`,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-rule px-3 py-2 font-sans text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
        >
          {busy ? "Traitement…" : label}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-sans text-xs text-muted-foreground underline"
          >
            Retirer
          </button>
        ) : null}
      </div>
      <p className="font-sans text-xs text-muted-foreground">
        Photo (JPEG, PNG, WebP, HEIC, SVG…), vidéo (MP4, WebM, MOV) ou audio (MP3, WAV,
        M4A) — 50 Mo maximum.
      </p>
      {value && type === "image" ? (
        <img
          src={value}
          alt="Aperçu du média publicitaire"
          className="aspect-[16/9] w-full max-w-sm rounded-md border border-rule object-cover"
        />
      ) : null}
      {value && type === "video" ? (
        <video
          src={value}
          controls
          muted
          playsInline
          className="aspect-[16/9] w-full max-w-sm rounded-md border border-rule object-cover"
        />
      ) : null}
      {value && type === "audio" ? (
        <audio src={value} controls className="w-full max-w-sm" />
      ) : null}
    </div>
  );
}
