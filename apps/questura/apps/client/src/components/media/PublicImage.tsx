"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type ReactEventHandler } from "react";

import { buildSrcSet } from "@/components/media/imageSrcSet";
import { retryOriginalImage } from "@/components/media/retryOriginalImage";

export type PublicImageProps = {
  src: string;
  alt?: string | null;
  /**
   * Layout hints, not the file's real size. Omitted by callers whose image is
   * sized entirely by CSS inside an aspect-ratio box: adding the attributes
   * there would introduce a ratio the markup never had.
   */
  width?: number;
  height?: number;
  sizes: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  /**
   * Structural rather than React's own `Ref`: two copies of @types/react are
   * resolved in this app, and a ref typed from either one is rejected by the
   * JSX that resolved the other. This shape is assignable to both.
   */
  imgRef?:
    | { current: HTMLImageElement | null }
    | ((element: HTMLImageElement | null) => void)
    | null;
  onLoad?: ReactEventHandler<HTMLImageElement>;
  onError?: ReactEventHandler<HTMLImageElement>;
};

export function PublicImage({
  alt,
  decoding = "async",
  fetchPriority,
  imgRef,
  loading,
  priority = false,
  onError,
  sizes,
  src,
  width,
  ...props
}: PublicImageProps) {
  const srcSet = buildSrcSet(src);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const setImageRef = useCallback(
    (image: HTMLImageElement | null) => {
      imageRef.current = image;
      if (typeof imgRef === "function") imgRef(image);
      else if (imgRef) imgRef.current = image;
    },
    [imgRef],
  );

  // A missing rung can fail before hydration attaches onError, and React does
  // not replay that event, so check once the element is ours.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) retryOriginalImage(image);
  }, [src]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      {...props}
      ref={setImageRef}
      onError={(event) => {
        if (!retryOriginalImage(event.currentTarget)) onError?.(event);
      }}
      alt={alt ?? ""}
      decoding={decoding}
      fetchPriority={priority ? "high" : fetchPriority ?? "auto"}
      loading={priority ? "eager" : loading ?? "lazy"}
      src={src}
      srcSet={srcSet}
      /* `sizes` without `srcSet` is inert: the browser ignores it and takes the
         only file on offer. Emit the pair or neither, never a value that reads
         as if it were steering something. */
      sizes={srcSet ? sizes : undefined}
      width={width}
    />
  );
}

export type PublicSourceProps = {
  src: string;
  /** The art-direction query, e.g. `(min-width: 768px)`. */
  media: string;
  sizes: string;
};

/**
 * The `<source>` half of a `<picture>`.
 *
 * Art direction (which crop) and resolution switching (which size of that crop)
 * are different axes and both belong here: a desktop `<source>` that switches
 * crop but not size still hands a 1920px file to a 576px card. When the URL has
 * no ladder, this falls back to the single URL the markup used before, because
 * a `<source>` without `srcSet` matches nothing and would blank the image.
 */
export function PublicSource({ media, sizes, src }: PublicSourceProps) {
  const srcSet = buildSrcSet(src);

  // The sibling PublicImage owns error recovery; this names the crop to fall
  // back to if a rung of this source's ladder is missing.
  return (
    <source
      media={media}
      srcSet={srcSet ?? src}
      sizes={srcSet ? sizes : undefined}
      data-fallback-src={src}
    />
  );
}
