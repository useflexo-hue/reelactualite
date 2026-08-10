import { SmartImage } from "@/components/site/SmartImage";
import { parseArticleBody, vimeoEmbedUrl, youtubeEmbedUrl } from "@/lib/article-body";

/** Rend le corps d'un article : paragraphes, photos et vidéos insérées au fil du texte. */
export function ArticleBody({
  body,
  paragraphClassName,
}: {
  body: string | null | undefined;
  paragraphClassName?: string;
}) {
  const blocks = parseArticleBody(body);
  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className={paragraphClassName}>
              {block.text}
            </p>
          );
        }

        if (block.type === "image") {
          return (
            <figure key={i} className="my-6">
              <SmartImage
                src={block.url}
                alt={block.alt || ""}
                width={1200}
                height={675}
                sizes="(max-width: 768px) 100vw, 680px"
                className="w-full rounded-sm object-cover"
              />
              {block.alt ? (
                <figcaption className="mt-1.5 font-sans text-xs text-muted-foreground">
                  {block.alt}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        const embed = youtubeEmbedUrl(block.url) ?? vimeoEmbedUrl(block.url);
        return (
          <div key={i} className="my-6 aspect-video w-full overflow-hidden rounded-sm bg-black">
            {embed ? (
              <iframe
                src={embed}
                title="Vidéo"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={block.url} controls className="h-full w-full" />
            )}
          </div>
        );
      })}
    </>
  );
}
