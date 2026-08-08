import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACCEPT_ATTR, mediaUrl } from "@/lib/image";
import { uuid } from "@/lib/utils";

const MAX_EDGE = 2000;

/** Convertit n'importe quel fichier image en WebP optimisé (HEIC/TIFF inclus). */
async function processImage(file: File): Promise<{ blob: Blob; ext: string }> {
  // SVG : pas de rasterisation, on garde le vectoriel tel quel.
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
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (blob) return { blob, ext: "webp" };

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88),
  );
  if (!jpeg) throw new Error("Conversion impossible");
  return { blob: jpeg, ext: "jpg" };
}

export function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const { blob, ext } = await processImage(file);
      const path = `${new Date().getFullYear()}/${uuid()}.${ext}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, blob, { contentType: blob.type || "image/webp", upsert: false });
      if (error) throw error;
      onChange(mediaUrl(path));
      toast.success("Photo importée et optimisée");
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
          accept={ACCEPT_ATTR}
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
          className="rounded-sm border border-rule px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {busy ? "Traitement…" : "Importer une photo"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="font-sans text-xs text-muted-foreground underline"
          >
            Retirer
          </button>
        ) : null}
      </div>
      <p className="font-sans text-xs text-muted-foreground">
        Tous formats acceptés (JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, HEIC/iPhone, SVG) —
        redimensionnement et conversion automatiques.
      </p>
      {value ? (
        <img
          src={value}
          alt="Aperçu de la photo de une"
          className="aspect-[16/9] w-full max-w-sm rounded-sm border border-rule object-cover"
        />
      ) : null}
    </div>
  );
}
