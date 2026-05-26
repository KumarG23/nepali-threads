import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import config from "@payload-config";

import ProductCard from "@/components/storefront/ProductCard";
import type { Product } from "@/payload-types";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every piece in the current collection.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "products",
    where: { status: { equals: "published" } },
    limit: 100,
    sort: "-createdAt",
  });
  const products = result.docs as Product[];

  const renderableProducts = products.filter((product) => {
    const img = product.images?.[0]?.image;
    return img && typeof img === "object" && img.url;
  });

  if (renderableProducts.length === 0) {
    return (
      <article className="mx-auto max-w-3xl px-6 py-16 text-center sm:px-8 lg:px-12 lg:py-24">
        <h1 className="font-serif text-display text-neutral-ink mb-4">
          The shop is quiet for the moment.
        </h1>
        <p className="font-sans text-body text-neutral-ink/70">
          We&apos;re between collections. Check back soon — or sign up below to
          be the first to know when new pieces land.
        </p>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <h1 className="font-serif text-display text-neutral-ink mb-2">Shop</h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-12 max-w-xl">
        {renderableProducts.length === 1
          ? "One piece, made by hand."
          : `${renderableProducts.length} pieces, each made by hand.`}
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
    </article>
  );
}
