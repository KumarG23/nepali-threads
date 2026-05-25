import type { Metadata } from "next";

import Badge from "@/components/ui/Badge";
import Image from "@/components/ui/Image";

import { AddToCartButton } from "./_add-to-cart";

function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const SAMPLE_PRODUCT = {
  name: "Wool Cardigan",
  priceCents: 14500,
  imageSrc: "/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg",
  imageAlt:
    "Handwoven wool cardigan in deep red, draped over a wooden chair",
  description:
    "A heavyweight handwoven cardigan in slow-dyed wool. Made one at a time in a small studio outside Kathmandu. Loose, warm, and made to last decades.",
  badge: null as {
    label: string;
    variant: "neutral" | "primary" | "accent" | "muted";
  } | null,
  category: "Cardigans",
  inventoryNote:
    "Only a few made — once they're gone, they're gone for the season.",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: SAMPLE_PRODUCT.name,
    description: SAMPLE_PRODUCT.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Slug captured for TASK-018; all slugs return the same sample product.
  void slug;

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: image */}
        <div>
          <Image
            src={SAMPLE_PRODUCT.imageSrc}
            alt={SAMPLE_PRODUCT.imageAlt}
            aspectRatio="portrait"
            rounded="lg"
            priority
          />
        </div>

        {/* Right: info, sticky on desktop */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-2">
            {SAMPLE_PRODUCT.category}
          </p>
          <h1 className="font-serif text-display text-neutral-ink mb-4">
            {SAMPLE_PRODUCT.name}
          </h1>
          <div className="flex items-center gap-3 mb-6">
            <p className="font-serif text-h1 text-neutral-ink">
              {formatPriceCents(SAMPLE_PRODUCT.priceCents)}
            </p>
            {SAMPLE_PRODUCT.badge && (
              <Badge variant={SAMPLE_PRODUCT.badge.variant} size="md">
                {SAMPLE_PRODUCT.badge.label}
              </Badge>
            )}
          </div>
          <p className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-6">
            {SAMPLE_PRODUCT.description}
          </p>
          <p className="font-sans text-small text-brand-gold-700 italic mb-8">
            {SAMPLE_PRODUCT.inventoryNote}
          </p>
          <AddToCartButton />
        </div>
      </div>
    </article>
  );
}
