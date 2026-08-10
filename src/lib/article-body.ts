// Corps d'article : texte brut avec paragraphes séparés par une ligne vide,
// plus deux marqueurs simples permettant d'insérer une photo ou une vidéo au
// milieu du texte : ![légende](url-image) et [[video:url]].
export type ArticleBodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string }
  | { type: "video"; url: string };

const IMAGE_RE = /^!\[([^\]]*)\]\((\S+)\)$/;
const VIDEO_RE = /^\[\[video:(\S+)\]\]$/;

export function parseArticleBody(body: string | null | undefined): ArticleBodyBlock[] {
  return (body ?? "")
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): ArticleBodyBlock => {
      const img = block.match(IMAGE_RE);
      if (img) return { type: "image", alt: img[1] ?? "", url: img[2] ?? "" };
      const vid = block.match(VIDEO_RE);
      if (vid) return { type: "video", url: vid[1] ?? "" };
      return { type: "paragraph", text: block };
    });
}

export function imageMarker(url: string, alt = "") {
  return `![${alt}](${url})`;
}

export function videoMarker(url: string) {
  return `[[video:${url}]]`;
}

export function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}
