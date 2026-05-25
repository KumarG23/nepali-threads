"use client";

import { useState } from "react";

import Image from "@/components/ui/Image";

type GalleryImage = {
  url: string;
  alt: string;
};

type PdpGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

export function PdpGallery({ images, productName }: PdpGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-neutral-ink/10 font-sans text-small text-neutral-ink/40">
        No image yet
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <Image
        src={images[0].url}
        alt={images[0].alt || productName}
        aspectRatio="portrait"
        rounded="lg"
        priority
      />
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div>
      {/* Main image */}
      <Image
        key={activeImage.url}
        src={activeImage.url}
        alt={activeImage.alt || productName}
        aspectRatio="portrait"
        rounded="lg"
        priority={activeIndex === 0}
      />

      {/* Thumbnail strip */}
      <ul
        role="list"
        aria-label="Product images"
        className="mt-4 flex flex-wrap gap-2"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % images.length);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            setActiveIndex(
              (i) => (i - 1 + images.length) % images.length
            );
          }
        }}
      >
        {images.map((image, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={isActive ? "true" : undefined}
                className={`block w-16 rounded transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 sm:w-20 ${
                  isActive
                    ? "ring-2 ring-brand-red-700 ring-offset-2"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  aspectRatio="square"
                  rounded="md"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* SR-only live region announcing the active image */}
      <p className="sr-only" aria-live="polite">
        Image {activeIndex + 1} of {images.length}.
      </p>
    </div>
  );
}
