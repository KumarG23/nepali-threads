import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import config from "@payload-config";
import { getPayload } from "payload";

import catalogReviewPlan from "@/data/catalog-review-plan.json" with {
  type: "json",
};
import Badge from "@/components/ui/Badge";
import {
  buildCatalogReviewCards,
  validateCatalogReviewPlan,
} from "@/lib/catalog-review/plan";

import CreateDraftsButton from "./_create-drafts-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalog review",
  robots: { index: false, follow: false },
};

export default async function CatalogReviewPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (
    !user ||
    user.collection !== "users" ||
    (user.role !== "admin" && user.role !== "super-admin")
  ) {
    redirect("/admin/login");
  }

  const cards = buildCatalogReviewCards(
    validateCatalogReviewPlan(catalogReviewPlan)
  );

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <header className="mb-10 max-w-4xl">
        <Badge variant="accent" size="md" className="mb-4">
          Admin-only review
        </Badge>
        <h1 className="mb-4 font-serif text-display text-neutral-ink">
          Existing photos, grouped into product drafts
        </h1>
        <p className="mb-6 text-body text-neutral-ink/75">
          The Payload media library was scanned read-only: 266 images total,
          with 164 product photos grouped into 13 conservative product
          candidates. The 100 lifestyle photos stay unassigned for now. Two
          duplicate media records point to missing source files and are excluded.
        </p>
        <CreateDraftsButton />
      </header>

      <section
        aria-label="Proposed catalog products"
        className="grid grid-cols-1 gap-8 lg:grid-cols-2"
      >
        {cards.map((card) => (
          <article
            key={card.key}
            className="overflow-hidden rounded-lg border border-neutral-ink/15 bg-white shadow-sm"
          >
            <div className="grid grid-cols-2 gap-1 bg-neutral-ink/5 sm:grid-cols-4">
              {card.photoURLs.slice(0, 4).map((photoURL, index) => (
                <img
                  key={photoURL}
                  src={photoURL}
                  alt={`${card.name} review photo ${index + 1}`}
                  width={600}
                  height={400}
                  loading="lazy"
                  className="aspect-[3/2] h-full w-full object-cover"
                />
              ))}
            </div>
            <div className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-h2 text-neutral-ink">
                  {card.name}
                </h2>
                <Badge
                  variant={card.confidence === "high" ? "primary" : "muted"}
                >
                  {card.confidence} confidence
                </Badge>
                <Badge variant="neutral">
                  {card.selectedPhotoCount} selected / {card.groupedPhotoCount}{" "}
                  grouped photos
                </Badge>
              </div>
              <p className="text-body text-neutral-ink/75">{card.description}</p>
              {card.notes.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-small text-neutral-ink/65">
                  {card.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </article>
  );
}
