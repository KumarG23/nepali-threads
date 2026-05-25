import type { Metadata } from "next";

import Hero from "@/components/storefront/Hero";
import ProductCard from "@/components/storefront/ProductCard";

export const metadata: Metadata = {
  title: "Nepali Threads",
  description:
    "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
};

const PLACEHOLDER_IMAGE =
  "/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg";

export default function HomePage() {
  return (
    <>
      <Hero
        imageSrc={PLACEHOLDER_IMAGE}
        imageAlt="A handwoven wool cardigan draped over a wooden chair"
        eyebrow="New collection"
        heading="Made by hand in Nepal"
        body="A small studio releasing one collection at a time, woven with the same care our families taught us."
        cta={{ label: "Shop the collection", href: "/shop" }}
      />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <h2 className="font-serif text-h1 text-neutral-ink mb-2">
          Recent work
        </h2>
        <p className="font-sans text-body text-neutral-ink/70 mb-12 max-w-xl">
          A few pieces from the current collection. Each one is made by hand
          and there&apos;s only ever a small number.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <ProductCard
            name="Wool Cardigan"
            priceCents={14500}
            imageSrc={PLACEHOLDER_IMAGE}
            imageAlt="Handwoven wool cardigan in deep red"
          />
          <ProductCard
            name="Silk Scarf"
            priceCents={6500}
            imageSrc={PLACEHOLDER_IMAGE}
            imageAlt="Lightweight silk scarf with gold trim"
            badge={{ label: "New", variant: "accent" }}
          />
          <ProductCard
            name="Handwoven Sweater"
            priceCents={22000}
            imageSrc={PLACEHOLDER_IMAGE}
            imageAlt="Thick handwoven sweater in natural cream"
            badge={{ label: "Sold out", variant: "muted" }}
          />
          <ProductCard
            name="Cotton Tunic"
            priceCents={9500}
            imageSrc={PLACEHOLDER_IMAGE}
            imageAlt="Breathable cotton tunic for warm weather"
            badge={{ label: "Sale", variant: "primary" }}
          />
        </div>
      </section>

      <section className="bg-neutral-ink/5 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 text-center">
          <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
            Why we make this
          </p>
          <h2 className="font-serif text-h1 text-neutral-ink mb-6">
            A small studio, on purpose.
          </h2>
          <p className="font-sans text-body text-neutral-ink/80 leading-relaxed">
            Our pieces are made one collection at a time by the same hands that
            have been weaving cloth in Nepal for generations. Working small
            means we can keep that craft alive and pay the people who do the
            work properly.
          </p>
        </div>
      </section>
    </>
  );
}
