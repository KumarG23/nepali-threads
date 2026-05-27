"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PdpGallery } from "./_pdp-gallery";
import { AddToCartButton } from "./_add-to-cart";

import { formatPriceCents } from "@/lib/format";
import { RichText } from "@payloadcms/richtext-lexical/react";

import type { Product, ProductVariant } from "@/payload-types";

type GalleryImage = {
  url: string;
  alt: string;
};

interface PdpVariantSelectorProps {
  product: Product;
  variants: ProductVariant[];
  productGalleryImages: GalleryImage[];
  categoryLink?: React.ReactNode;
}

function isValidSwatchHex(hex: string | null | undefined): boolean {
  return typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex);
}

function extractVariantImages(variant: ProductVariant): GalleryImage[] {
  return (variant.images ?? [])
    .map((entry) => {
      const img = entry?.image;
      if (img && typeof img === "object" && img.url) {
        return { url: img.url, alt: img.alt ?? "" };
      }
      return null;
    })
    .filter((x): x is GalleryImage => x !== null);
}

function activePriceCents(product: Product, variant: ProductVariant): number {
  return variant.price ?? product.basePrice;
}

function activeGalleryImages(
  product: Product,
  variant: ProductVariant,
  productGalleryImages: GalleryImage[]
): GalleryImage[] {
  const variantImages = extractVariantImages(variant);
  return variantImages.length > 0 ? variantImages : productGalleryImages;
}

function inventoryLine(variant: ProductVariant): string | null {
  if (variant.inventoryCount <= 0) return "Sold out";
  if (variant.inventoryCount <= 3)
    return `Only ${variant.inventoryCount} left`;
  return null;
}

export function PdpVariantSelector({
  product,
  variants,
  productGalleryImages,
  categoryLink,
}: PdpVariantSelectorProps) {
  const initialId = useMemo(() => {
    const firstInStock = variants.find((v) => v.inventoryCount > 0);
    return firstInStock?.id ?? variants[0]?.id;
  }, [variants]);

  const [selectedId, setSelectedId] = useState<number>(initialId);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep selection in sync if initialId changes (e.g. remount with new data)
  useEffect(() => {
    if (!variants.find((v) => v.id === selectedId)) {
      setSelectedId(initialId);
    }
  }, [initialId, selectedId, variants]);

  const selectedVariant = variants.find((v) => v.id === selectedId)!;

  const galleryImages = activeGalleryImages(
    product,
    selectedVariant,
    productGalleryImages
  );
  const priceCents = activePriceCents(product, selectedVariant);
  const firstImage = galleryImages[0] ?? null;
  const inventoryText = inventoryLine(selectedVariant);
  const isSoldOut = selectedVariant.inventoryCount <= 0;

  function handleSelect(variantId: number) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant || variant.inventoryCount <= 0) return;
    setSelectedId(variantId);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const currentIndex = variants.findIndex((v) => v.id === selectedId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % variants.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + variants.length) % variants.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = variants.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextVariant = variants[nextIndex];
      if (nextVariant.inventoryCount > 0) {
        setSelectedId(nextVariant.id);
      }
      swatchRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <>
      {/* Gallery */}
      <div>
        <PdpGallery
          images={galleryImages}
          productName={product.name}
        />
      </div>

      {/* Right: info, sticky on desktop */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <h1 className="font-serif text-display text-neutral-ink mb-4">
          {product.name}
        </h1>

        <div className="flex items-center gap-3 mb-4">
          <p className="font-serif text-h1 text-neutral-ink">
            {formatPriceCents(priceCents)}
          </p>
        </div>

        {inventoryText && (
          <p
            className={`font-sans text-small mb-4 ${
              isSoldOut
                ? "text-neutral-ink/60"
                : "text-brand-red-700"
            }`}
          >
            {inventoryText}
          </p>
        )}

        {/* Swatch selector */}
        <div
          role="radiogroup"
          aria-label="Color"
          className="mb-6"
          onKeyDown={handleKeyDown}
        >
          <p className="font-sans text-small font-medium text-neutral-ink/80 mb-3">
            Color:{" "}
            <span className="font-normal text-neutral-ink/60">
              {selectedVariant.color ?? "Default"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {variants.map((variant, index) => {
              const isSelected = variant.id === selectedId;
              const isOutOfStock = variant.inventoryCount <= 0;
              const hasHex = isValidSwatchHex(variant.swatchHex);

              return (
                <div key={variant.id} className="flex flex-col items-center gap-1">
                  <button
                    ref={(el) => { swatchRefs.current[index] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={variant.color ?? `Variant ${index + 1}`}
                    aria-disabled={isOutOfStock || undefined}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleSelect(variant.id)}
                    className={[
                      "relative rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2",
                      isOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      isSelected
                        ? "ring-2 ring-brand-red-600 ring-offset-2"
                        : "ring-1 ring-neutral-ink/20 hover:ring-neutral-ink/40",
                      hasHex
                        ? "h-10 w-10 sm:h-11 sm:w-11"
                        : "min-h-[40px] px-3 py-2 sm:min-h-[44px] sm:px-4 font-sans text-small",
                    ].join(" ")}
                    style={
                      hasHex && variant.swatchHex
                        ? { backgroundColor: variant.swatchHex }
                        : undefined
                    }
                  >
                    {!hasHex && (variant.color ?? "—")}
                  </button>
                  {isOutOfStock && (
                    <span className="font-sans text-[0.625rem] text-neutral-ink/60">
                      Sold out
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {categoryLink}

        {product.description && (
          <div className="prose font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
            <RichText data={product.description} />
          </div>
        )}

        <AddToCartButton
          productId={product.id}
          variantId={selectedVariant.id}
          productSlug={product.slug}
          name={product.name}
          variantLabel={selectedVariant.color ?? undefined}
          priceCents={priceCents}
          imageSrc={firstImage?.url ?? ""}
          imageAlt={firstImage?.alt ?? product.name}
          disabled={isSoldOut}
        />
      </div>
    </>
  );
}
