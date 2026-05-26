import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { RichText } from "@payloadcms/richtext-lexical/react";

import config from "@payload-config";

import ProductCard from "@/components/storefront/ProductCard";
import type { Product } from "@/payload-types";

import { AddToCartButton } from "./_add-to-cart";
import { PdpGallery } from "./_pdp-gallery";

import { formatPriceCents } from "@/lib/format";

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

  const firstImage = (product.images ?? []).find((entry) => {
    const img = entry?.image;
    return img && typeof img === "object" && img.url;
  })?.image;
  const firstImageUrl =
    firstImage && typeof firstImage === "object" ? firstImage.url : null;

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? undefined,
    // Only override openGraph when we actually have a product image.
    // Omitting the field entirely lets Next's auto-applied
    // opengraph-image.tsx fallback take over — passing
    // `images: undefined` would count as explicitly cleared and
    // break the fallback chain.
    ...(firstImageUrl
      ? { openGraph: { images: [{ url: firstImageUrl }] } }
      : {}),
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

  const galleryImages = (product.images ?? [])
    .map((entry) => {
      const img = entry?.image;
      if (img && typeof img === "object" && img.url) {
        return { url: img.url, alt: img.alt ?? "" };
      }
      return null;
    })
    .filter((x): x is { url: string; alt: string } => x !== null);

  const firstImage = galleryImages[0] ?? null;

  const payload = await getPayload({ config });

  const categoryId =
    typeof product.category === "object" && product.category?.id
      ? product.category.id
      : null;

  const relatedProductsResult = categoryId
    ? await payload.find({
        collection: "products",
        where: {
          and: [
            { status: { equals: "published" } },
            { category: { equals: categoryId } },
            { id: { not_equals: product.id } },
          ],
        },
        limit: 4,
        sort: "-createdAt",
      })
    : null;

  const relatedProducts = (relatedProductsResult?.docs ?? []) as Product[];

  const renderableRelated = relatedProducts.filter((p) => {
    const img = p.images?.[0]?.image;
    return img && typeof img === "object" && img.url;
  });

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: image gallery */}
        <div>
          <PdpGallery
            images={galleryImages}
            productName={product.name}
          />
        </div>

        {/* Right: info, sticky on desktop */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {typeof product.category === "object" &&
            product.category?.name &&
            product.category?.slug && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 hover:text-brand-red-700 transition-colors mb-2 inline-block"
              >
                {product.category.name}
              </Link>
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
            <div className="prose font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
              <RichText data={product.description} />
            </div>
          )}
          <AddToCartButton
            productId={product.id}
            productSlug={product.slug}
            name={product.name}
            priceCents={product.basePrice}
            imageSrc={firstImage?.url ?? ""}
            imageAlt={firstImage?.alt ?? product.name}
          />
        </div>
      </div>

      {renderableRelated.length > 0 && (
        <section className="mt-16 border-t border-neutral-ink/10 pt-12 lg:mt-24 lg:pt-16">
          <h2 className="font-serif text-h1 text-neutral-ink mb-2">
            You may also like
          </h2>
          <p className="font-sans text-body text-neutral-ink/70 mb-8 max-w-xl">
            More from this category.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {renderableRelated.map((related) => {
              const firstImage =
                related.images?.[0]?.image &&
                typeof related.images[0].image === "object"
                  ? related.images[0].image
                  : null;

              return (
                <Link
                  key={related.id}
                  href={`/products/${related.slug}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
                >
                  <ProductCard
                    name={related.name}
                    priceCents={related.basePrice}
                    imageSrc={firstImage?.url ?? ""}
                    imageAlt={firstImage?.alt ?? related.name}
                    badge={
                      related.status === "archived"
                        ? { label: "Sold out", variant: "muted" }
                        : undefined
                    }
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
