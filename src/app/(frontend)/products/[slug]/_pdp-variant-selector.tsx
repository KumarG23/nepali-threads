"use client";

import { useMemo, useRef, useState } from "react";

import { PdpGallery } from "./_pdp-gallery";
import { AddToCartButton } from "./_add-to-cart";

import { formatPriceCents } from "@/lib/format";

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
  descriptionNode?: React.ReactNode;
}

const SIZE_ORDER: NonNullable<ProductVariant["size"]>[] = [
  "Small",
  "Medium",
  "Large",
  "XL",
  "XXL",
  "One size fits most",
];

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

function activePriceCents(
  product: Product,
  variant: ProductVariant | null
): number {
  return variant?.price ?? product.basePrice;
}

function activeGalleryImages(
  product: Product,
  variant: ProductVariant | null,
  productGalleryImages: GalleryImage[]
): GalleryImage[] {
  if (!variant) return productGalleryImages;
  const variantImages = extractVariantImages(variant);
  return variantImages.length > 0 ? variantImages : productGalleryImages;
}

function inventoryLine(variant: ProductVariant | null): string | null {
  if (!variant) return null;
  if (variant.inventoryCount <= 0) return "Sold out";
  if (variant.inventoryCount <= 3)
    return `Only ${variant.inventoryCount} left`;
  return null;
}

function resolveVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null
): ProductVariant | null {
  return (
    variants.find((v) => {
      const vColor = (v.color ?? null) || null;
      const vSize = (v.size ?? null) || null;
      return vColor === color && vSize === size;
    }) ?? null
  );
}

function formatVariantLabel(
  color: string | null,
  size: string | null
): string | undefined {
  if (color && size) return `${color}, ${size}`;
  if (color) return color;
  if (size) return size;
  return undefined;
}

function isColorAllSoldOut(
  color: string,
  variants: ProductVariant[]
): boolean {
  const colorVariants = variants.filter((v) => v.color === color);
  return (
    colorVariants.length > 0 &&
    colorVariants.every((v) => v.inventoryCount <= 0)
  );
}

function isSizeDisabled(
  size: string,
  color: string | null,
  variants: ProductVariant[]
): boolean {
  const match = variants.find((v) => {
    const vColor = (v.color ?? null) || null;
    return vColor === color && v.size === size;
  });
  return !match || match.inventoryCount <= 0;
}

export function PdpVariantSelector({
  product,
  variants,
  productGalleryImages,
  categoryLink,
  descriptionNode,
}: PdpVariantSelectorProps) {
  const derived = useMemo(() => {
    const colors = [
      ...new Set(
        variants
          .map((v) => v.color)
          .filter(
            (c): c is string => typeof c === "string" && c.trim().length > 0
          )
      ),
    ];

    const rawSizes: NonNullable<ProductVariant["size"]>[] = [
      ...new Set(
        variants
          .map((v) => v.size)
          .filter(
            (s): s is NonNullable<ProductVariant["size"]> => Boolean(s)
          )
      ),
    ];
    const sizes = rawSizes
      .slice()
      .sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));

    const defaultColor = (() => {
      const inStock = colors.find((c) =>
        variants.some((v) => v.color === c && v.inventoryCount > 0)
      );
      return inStock ?? colors[0] ?? null;
    })();

    const defaultSize = (() => {
      if (sizes.length === 0) return null;
      if (defaultColor) {
        const inStock = sizes.find((s) =>
          variants.some(
            (v) =>
              v.color === defaultColor && v.size === s && v.inventoryCount > 0
          )
        );
        return inStock ?? sizes[0] ?? null;
      }
      const inStock = sizes.find((s) =>
        variants.some((v) => v.size === s && v.inventoryCount > 0)
      );
      return inStock ?? sizes[0] ?? null;
    })();

    return { colors, sizes, defaultColor, defaultSize };
  }, [variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    () => derived.defaultColor
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    () => derived.defaultSize
  );

  const colorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sizeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const resolvedVariant = resolveVariant(variants, selectedColor, selectedSize);

  const galleryImages = activeGalleryImages(
    product,
    resolvedVariant,
    productGalleryImages
  );
  const priceCents = activePriceCents(product, resolvedVariant);
  const firstImage = galleryImages[0] ?? null;
  const inventoryText = inventoryLine(resolvedVariant);
  const isSoldOut = resolvedVariant ? resolvedVariant.inventoryCount <= 0 : true;
  const isUnavailable = resolvedVariant === null;

  function reconcileSizeForColor(color: string) {
    if (!selectedSize) return;
    const hasCombo = variants.some((v) => {
      const vColor = (v.color ?? null) || null;
      return vColor === color && v.size === selectedSize;
    });
    if (hasCombo) return;
    const firstInStock = derived.sizes.find((s) =>
      variants.some((v) => {
        const vColor = (v.color ?? null) || null;
        return vColor === color && v.size === s && v.inventoryCount > 0;
      })
    );
    setSelectedSize(firstInStock ?? derived.sizes[0] ?? null);
  }

  function handleColorChange(color: string | null) {
    if (color === null) return;
    if (isColorAllSoldOut(color, variants)) return;
    setSelectedColor(color);
    reconcileSizeForColor(color);
  }

  function handleSizeChange(size: string | null) {
    if (size === null) return;
    if (isSizeDisabled(size, selectedColor, variants)) return;
    setSelectedSize(size);
  }

  function handleColorKeyDown(event: React.KeyboardEvent) {
    if (derived.colors.length === 0) return;
    const currentIndex = derived.colors.findIndex((c) => c === selectedColor);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % derived.colors.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex =
        (currentIndex - 1 + derived.colors.length) % derived.colors.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = derived.colors.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextColor = derived.colors[nextIndex];
      if (!isColorAllSoldOut(nextColor, variants)) {
        setSelectedColor(nextColor);
        // Same reconciliation as the click path: if the current size
        // isn't available in the new color, pull selection back to a
        // valid size so the resolved variant stays useful.
        reconcileSizeForColor(nextColor);
      }
      colorRefs.current[nextIndex]?.focus();
    }
  }

  function handleSizeKeyDown(event: React.KeyboardEvent) {
    if (derived.sizes.length === 0) return;
    const currentIndex = derived.sizes.findIndex((s) => s === selectedSize);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % derived.sizes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex =
        (currentIndex - 1 + derived.sizes.length) % derived.sizes.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = derived.sizes.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextSize = derived.sizes[nextIndex];
      if (!isSizeDisabled(nextSize, selectedColor, variants)) {
        setSelectedSize(nextSize);
      }
      sizeRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <>
      {/* Gallery */}
      <div>
        <PdpGallery images={galleryImages} productName={product.name} />
      </div>

      {/* Right: info, sticky on desktop */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        {categoryLink}
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
              resolvedVariant && resolvedVariant.inventoryCount <= 0
                ? "text-neutral-ink/60"
                : "text-brand-red-700"
            }`}
          >
            {inventoryText}
          </p>
        )}

        {/* Color selector */}
        {derived.colors.length > 0 && (
          <div
            role="radiogroup"
            aria-label="Color"
            className="mb-6"
            onKeyDown={handleColorKeyDown}
          >
            <p className="font-sans text-small font-medium text-neutral-ink/80 mb-3">
              Color:{" "}
              <span className="font-normal text-neutral-ink/60">
                {selectedColor ?? "—"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {derived.colors.map((color, index) => {
                const isSelected = color === selectedColor;
                const isOutOfStock = isColorAllSoldOut(color, variants);
                const representative = variants.find((v) => v.color === color);
                const hasHex = isValidSwatchHex(representative?.swatchHex);

                return (
                  <div
                    key={color}
                    className="flex flex-col items-center gap-1"
                  >
                    <button
                      ref={(el) => {
                        colorRefs.current[index] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={color}
                      aria-disabled={isOutOfStock || undefined}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => handleColorChange(color)}
                      className={[
                        "relative rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2",
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer",
                        isSelected
                          ? "ring-2 ring-brand-red-600 ring-offset-2"
                          : "ring-1 ring-neutral-ink/20 hover:ring-neutral-ink/40",
                        hasHex
                          ? "h-10 w-10 sm:h-11 sm:w-11"
                          : "min-h-[40px] px-3 py-2 sm:min-h-[44px] sm:px-4 font-sans text-small",
                      ].join(" ")}
                      style={
                        hasHex && representative?.swatchHex
                          ? { backgroundColor: representative.swatchHex }
                          : undefined
                      }
                    >
                      {!hasHex && color}
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
        )}

        {/* Size selector */}
        {derived.sizes.length > 0 && (
          <div
            role="radiogroup"
            aria-label="Size"
            className="mb-6"
            onKeyDown={handleSizeKeyDown}
          >
            <p className="font-sans text-small font-medium text-neutral-ink/80 mb-3">
              Size:{" "}
              <span className="font-normal text-neutral-ink/60">
                {selectedSize ?? "—"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {derived.sizes.map((size, index) => {
                const isSelected = size === selectedSize;
                const isDisabled = isSizeDisabled(
                  size,
                  selectedColor,
                  variants
                );

                return (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-1"
                  >
                    <button
                      ref={(el) => {
                        sizeRefs.current[index] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={size}
                      aria-disabled={isDisabled || undefined}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => handleSizeChange(size)}
                      className={[
                        "relative rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 font-sans text-small",
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer",
                        isSelected
                          ? "ring-2 ring-brand-red-600"
                          : "ring-1 ring-neutral-ink/20 hover:ring-neutral-ink/40",
                        "min-h-[40px] px-4 py-2",
                      ].join(" ")}
                    >
                      {size}
                    </button>
                    {isDisabled && (
                      <span className="font-sans text-[0.625rem] text-neutral-ink/60">
                        Sold out
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {descriptionNode}

        <AddToCartButton
          productId={product.id}
          variantId={resolvedVariant?.id}
          productSlug={product.slug}
          name={product.name}
          variantLabel={formatVariantLabel(selectedColor, selectedSize)}
          priceCents={priceCents}
          imageSrc={firstImage?.url ?? ""}
          imageAlt={firstImage?.alt ?? product.name}
          disabled={isSoldOut}
          unavailable={isUnavailable}
        />
      </div>
    </>
  );
}
