"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type ReactEventHandler } from "react";

import { buildSrcSet } from "@/components/media/imageSrcSet";
import { retryOriginalImage } from "@/components/media/retryOriginalImage";
import { markPhotoReady } from "@/lib/media/photoReady";

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
  /**
   * Hold the photo back until it has fully downloaded, then fade it in
   * (lib/media/photoReady.ts). On by default: a photo painting strip by strip
   * is never what a reader should see. Off only where something else already
   * decides when the image shows.
   */
  fade?: boolean;
};

export function PublicImage({
  alt,
  decoding = "async",
  fetchPriority,
  imgRef,
  fade = true,
  loading,
  priority = false,
  onError,
  onLoad,
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
      // A cached file can finish before React attaches onLoad.
      markPhotoReady(image);
      if (typeof imgRef === "function") imgRef(image);
      else if (imgRef) imgRef.current = image;
    },
    [imgRef],
  );

  // A missing rung can fail before hydration attaches onError, and React does
  // not replay that event, so check once the element is ours.
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (image.complete && image.naturalWidth === 0) retryOriginalImage(image);
    else if (!image.complete) image.removeAttribute("data-loaded"); // a new photo in the same frame
    else markPhotoReady(image);
  }, [src]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      {...props}
      ref={setImageRef}
      data-fade={fade ? "" : undefined}
      /* The <head> script adds data-loaded before hydration (photoReady.ts). */
      suppressHydrationWarning
      onLoad={(event) => {
        markPhotoReady(event.currentTarget);
        onLoad?.(event);
      }}
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
