/**
 * A saved map picture: the 1x file for phones, the 2x one above that. These
 * files have no width ladder (they are not media-set variants), so the pair is
 * the srcset. It fades in whole like every photo: the <head> script marks it
 * loaded (lib/media/photoReadyScript.ts).
 */
export default function MapPicture({
  src,
  srcSmall,
  smallWidth,
  width,
  height,
  sizes,
  alt,
}: {
  src: string
  srcSmall: string
  smallWidth: number
  width: number
  height: number
  sizes: string
  alt: string
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      className="jp-img"
      src={srcSmall}
      srcSet={`${srcSmall} ${smallWidth}w, ${src} ${smallWidth * 2}w`}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading="lazy"
      decoding="async"
      data-fade=""
      suppressHydrationWarning
    />
  )
}
