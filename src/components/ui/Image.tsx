import NextImage from "next/image";
import React from "react";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface ImageProps {
  src: string;
  alt: string;
  aspectRatio?: "square" | "portrait" | "landscape" | "tall";
  rounded?: "none" | "sm" | "md" | "lg" | "xl";
  objectFit?: "cover" | "contain";
  priority?: boolean;
  sizes?: string;
  className?: string;
  ref?: React.Ref<HTMLImageElement>;
}

// fill mode + aspect-ratio container chosen over intrinsic width/height:
// storefront grids need consistent frame dimensions regardless of source
// image dimensions. fill + object-cover guarantees every product tile is
// the same shape. Default aspectRatio="square" is the safest universal.

export function Image({
  src,
  alt,
  aspectRatio = "square",
  rounded = "lg",
  objectFit = "cover",
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
  ref,
}: ImageProps) {
  const aspectClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
    tall: "aspect-[2/3]",
  }[aspectRatio];

  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
  }[rounded];

  return (
    <div
      className={cx(
        "relative overflow-hidden",
        aspectClasses,
        roundedClasses,
        className
      )}
    >
      <NextImage
        ref={ref}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={objectFit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}

export default Image;
