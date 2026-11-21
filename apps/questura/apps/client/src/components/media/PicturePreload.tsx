import { buildSrcSet } from "@/components/media/imageSrcSet";

type PicturePreloadSource = { src: string; media: string; sizes: string };

/**
 * Preloads for the top photo of a page when it is drawn as a `<picture>`.
 *
 * React preloads a high-priority `<img>` on its own, but not one inside a
 * `<picture>`: which file the browser wants depends on the `<source>`s, so it
 * waits for the parser. The homepage's lead photo is one, and it arrived after
 * the small photos beside it. One preload per crop, each limited to the widths
 * where that crop is the one drawn, so no width fetches both.
 *
 * Render it only for the page's priority photo.
 */
export function PicturePreload({
  source,
  fallback,
}: {
  source: PicturePreloadSource | null;
  fallback: { src: string; sizes: string };
}) {
  const links = source
    ? [source, { ...fallback, media: `not all and ${source.media}` }]
    : [{ ...fallback, media: undefined }];
  return (
    <>
      {links.map((link) => {
        const srcSet = buildSrcSet(link.src);
        return (
          <link
            key={`${link.media ?? "all"}:${link.src}`}
            rel="preload"
            as="image"
            href={link.src}
            imageSrcSet={srcSet ?? undefined}
            imageSizes={srcSet ? link.sizes : undefined}
            media={link.media}
            fetchPriority="high"
          />
        );
      })}
    </>
  );
}
