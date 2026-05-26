import { getPayload } from "payload";

import config from "@payload-config";

import Link from "next/link";

import Hero from "@/components/storefront/Hero";
import ProductCard from "@/components/storefront/ProductCard";

// Fetches the homepage hero global at request time so admin edits in the
// Payload UI propagate immediately, instead of being baked in at build time.
// Matches the dynamic-rendering choice of /shop and /categories/[slug] —
// both fetch fresh from Payload on every request.
export const dynamic = "force-dynamic";

const FALLBACK_HERO_IMAGE =
  "/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg";
const FALLBACK_HERO_IMAGE_ALT =
  "A handwoven wool cardigan draped over a wooden chair";
const FALLBACK_EYEBROW = "New collection";
const FALLBACK_HEADING = "Made by hand in Nepal";
const FALLBACK_BODY =
  "A small studio releasing one collection at a time, woven with the same care our families taught us.";
const FALLBACK_CTA_LABEL = "Shop the collection";
const FALLBACK_CTA_HREF = "/shop";

const PLACEHOLDER_IMAGE =
  "/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg";

export default async function HomePage() {
  const payload = await getPayload({ config });
  const hero = await payload.findGlobal({ slug: "homepageHero" });

  const heroImageObj =
    hero.image && typeof hero.image === "object" ? hero.image : null;

  // Use `||` (not `??`) so an empty-string value from a cleared admin field
  // also falls back to the default. Payload returns nullish for never-set
  // fields and empty strings for cleared fields; both should fall back.
  const heroProps = {
    imageSrc: heroImageObj?.url || FALLBACK_HERO_IMAGE,
    imageAlt: heroImageObj?.alt || FALLBACK_HERO_IMAGE_ALT,
    eyebrow: hero.eyebrow || FALLBACK_EYEBROW,
    heading: hero.heading || FALLBACK_HEADING,
    body: hero.body || FALLBACK_BODY,
    cta: {
      label: hero.ctaLabel || FALLBACK_CTA_LABEL,
      href: hero.ctaHref || FALLBACK_CTA_HREF,
    },
  };

  return (
    <>
      <Hero {...heroProps} />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <h2 className="font-serif text-h1 text-neutral-ink mb-2">
          Recent work
        </h2>
        <p className="font-sans text-body text-neutral-ink/70 mb-12 max-w-xl">
          A few pieces from the current collection. Each one is made by hand
          and there&apos;s only ever a small number.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <Link
            href="/products/test-romper"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
          >
            <ProductCard
              name="Wool Cardigan"
              priceCents={14500}
              imageSrc={PLACEHOLDER_IMAGE}
              imageAlt="Handwoven wool cardigan in deep red"
            />
          </Link>
          <Link
            href="/products/test-romper"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
          >
            <ProductCard
              name="Silk Scarf"
              priceCents={6500}
              imageSrc={PLACEHOLDER_IMAGE}
              imageAlt="Lightweight silk scarf with gold trim"
              badge={{ label: "New", variant: "accent" }}
            />
          </Link>
          <Link
            href="/products/test-romper"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
          >
            <ProductCard
              name="Handwoven Sweater"
              priceCents={22000}
              imageSrc={PLACEHOLDER_IMAGE}
              imageAlt="Thick handwoven sweater in natural cream"
              badge={{ label: "Sold out", variant: "muted" }}
            />
          </Link>
          <Link
            href="/products/test-romper"
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
          >
            <ProductCard
              name="Cotton Tunic"
              priceCents={9500}
              imageSrc={PLACEHOLDER_IMAGE}
              imageAlt="Breathable cotton tunic for warm weather"
              badge={{ label: "Sale", variant: "primary" }}
            />
          </Link>
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
