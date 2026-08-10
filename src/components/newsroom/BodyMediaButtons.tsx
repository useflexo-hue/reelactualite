import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACCEPT_ATTR, mediaUrl } from "@/lib/image";
import { uuid } from "@/lib/utils";
import { imageMarker, videoMarker } from "@/lib/article-body";
import { processImage } from "@/components/newsroom/ImageUploader";

/**
 * Boutons permettant d'insérer une photo ou une vidéo au milieu du corps de
 * l'article, à l'endroit du curseur dans la zone de texte.
 */
export function BodyMediaButtons({
  textareaRef,
  onInsert,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (marker: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function insertAtCursor(marker: string) {
    const el = textareaRef.current;
    if (!el) {
      onInsert(marker);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const needsLeadingBreak = before.length > 0 && !before.endsWith("\n\n");
    const needsTrailingBreak = after.length > 0 && !after.startsWith("\n\n");
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${marker}${needsTrailingBreak ? "\n\n" : ""}`;
    onInsert(before + insertion + after);
  }

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const { blob, ext } = await processImage(file);
      const path = `${new Date().getFullYear()}/${uuid()}.${ext}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, blob, { contentType: blob.type || "image/webp", upsert: false });
      if (error) throw error;
      const url = mediaUrl(path);
      const alt = window.prompt("Légende de la photo (optionnel) :", "") ?? "";
      insertAtCursor(imageMarker(url, alt.trim()));
      toast.success("Photo insérée dans l'article");
    } catch (err) {
      toast.error(
        `Import impossible : ${err instanceof Error ? err.message : "format non reconnu"}`,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleVideo() {
    const url = window.prompt(
      "Collez l'URL de la vidéo (YouTube, Vimeo ou lien direct .mp4) :",
      "",
    );
    if (!url?.trim()) return;
    insertAtCursor(videoMarker(url.trim()));
    toast.success("Vidéo insérée dans l'article");
  }

  return (
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
        className="rounded-sm border border-rule px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-wide disabled:opacity-50"
      >
        {busy ? "Import…" : "+ Photo dans le texte"}
      </button>
      <button
        type="button"
        onClick={handleVideo}
        className="rounded-sm border border-rule px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-wide"
      >
        + Vidéo dans le texte
      </button>
    </div>
  );
}
