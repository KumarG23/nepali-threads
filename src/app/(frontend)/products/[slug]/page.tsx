import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { RichText } from "@payloadcms/richtext-lexical/react";

import config from "@payload-config";

import Image from "@/components/ui/Image";
import type { Product } from "@/payload-types";

import { AddToCartButton } from "./_add-to-cart";

function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "products",
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: "published" } },
      ],
    },
    limit: 1,
  });
  return result.docs[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const firstImage =
    product.images?.[0]?.image &&
    typeof product.images[0].image === "object"
      ? product.images[0].image
      : null;

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: image */}
        <div>
          {firstImage ? (
            <Image
              src={firstImage.url ?? ""}
              alt={firstImage.alt ?? product.name}
              aspectRatio="portrait"
              rounded="lg"
              priority
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-neutral-ink/10 font-sans text-small text-neutral-ink/40">
              No image yet
            </div>
          )}
        </div>

        {/* Right: info, sticky on desktop */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {typeof product.category === "object" &&
            product.category?.name && (
              <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-2">
                {product.category.name}
              </p>
            )}
          <h1 className="font-serif text-display text-neutral-ink mb-4">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mb-6">
            <p className="font-serif text-h1 text-neutral-ink">
              {formatPriceCents(product.basePrice)}
            </p>
          </div>
          {product.description && (
            <div className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
              <RichText data={product.description} />
            </div>
          )}
          <AddToCartButton />
        </div>
      </div>
    </article>
  );
}
