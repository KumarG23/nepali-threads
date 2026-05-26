import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import Image from "@/components/ui/Image";
import ProductCard from "@/components/storefront/ProductCard";
import { JsonLd } from "@/lib/seo/json-ld";
import type { Category, Product } from "@/payload-types";

export const dynamic = "force-dynamic";

async function getCategoryBySlug(
  slug: string
): Promise<Category | undefined> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "categories",
    where: { slug: { equals: slug } },
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
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  const heroImage =
    category.image && typeof category.image === "object"
      ? category.image
      : null;
  const heroImageUrl = heroImage?.url ?? null;

  return {
    title: category.name,
    description: category.description ?? undefined,
    // See PDP comment — omit openGraph entirely when no image so the
    // default opengraph-image.tsx fallback applies.
    ...(heroImageUrl
      ? { openGraph: { images: [{ url: heroImageUrl }] } }
      : {}),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const payload = await getPayload({ config });
  const productsResult = await payload.find({
    collection: "products",
    where: {
      and: [
        { status: { equals: "published" } },
        { category: { equals: category.id } },
      ],
    },
    limit: 100,
    sort: "-createdAt",
  });
  const products = productsResult.docs as Product[];

  const renderableProducts = products.filter((product) => {
    const img = product.images?.[0]?.image;
    return img && typeof img === "object" && img.url;
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://nepali-threads.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `https://nepali-threads.com/categories/${category.slug}`,
      },
    ],
  };

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <JsonLd data={breadcrumbSchema} />
      {(() => {
        const heroImage =
          category.image && typeof category.image === "object"
            ? category.image
            : null;
        return heroImage ? (
          <div className="mx-auto mb-8 max-w-4xl lg:mb-12">
            <Image
              src={heroImage.url ?? ""}
              alt={heroImage.alt ?? category.name}
              aspectRatio="landscape"
              rounded="lg"
              priority
            />
          </div>
        ) : null;
      })()}

      <div className="mb-12 max-w-2xl">
        <h1 className="font-serif text-display text-neutral-ink mb-2">
          {category.name}
        </h1>
        {category.description && (
          <p className="font-sans text-body text-neutral-ink/70">
            {category.description}
          </p>
        )}
      </div>

      {renderableProducts.length === 0 ? (
        <p className="font-sans text-body text-neutral-ink/60">
          No pieces in this category yet. Check back soon.
        </p>
      ) : (
        <>
          <p className="font-sans text-body text-neutral-ink/70 mb-8">
            {renderableProducts.length === 1
              ? "One piece in this category."
              : `${renderableProducts.length} pieces in this category.`}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {renderableProducts.map((product) => {
              const firstImage =
                product.images?.[0]?.image &&
                typeof product.images[0].image === "object"
                  ? product.images[0].image
                  : null;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
                >
                  <ProductCard
                    name={product.name}
                    priceCents={product.basePrice}
                    imageSrc={firstImage?.url ?? ""}
                    imageAlt={firstImage?.alt ?? product.name}
                    badge={
                      product.status === "archived"
                        ? { label: "Sold out", variant: "muted" }
                        : undefined
                    }
                  />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}
