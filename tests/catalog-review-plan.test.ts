import assert from "node:assert/strict";
import test from "node:test";

import catalogReviewPlan from "../src/data/catalog-review-plan.json" with {
  type: "json",
};
import {
  buildCatalogReviewCards,
  buildCatalogReviewDrafts,
  validateCatalogReviewPlan,
} from "../src/lib/catalog-review/plan";

test("builds only hidden zero-price catalog review drafts from the reviewed plan", () => {
  const plan = validateCatalogReviewPlan(catalogReviewPlan);
  const drafts = buildCatalogReviewDrafts(plan);

  assert.equal(drafts.length, 13);
  for (const draft of drafts) {
    assert.match(draft.slug, /^catalog-review-/);
    assert.equal(draft.status, "draft");
    assert.equal(draft.featured, false);
    assert.equal(draft.basePrice, 0);
    assert.equal(draft.inventoryCount, null);
    assert.equal(draft.category, 1);
    assert.ok(draft.images.length >= 4);
    assert.ok(draft.images.every((image) => Number.isInteger(image.image)));
  }
});

test("rejects duplicate deterministic draft slugs", () => {
  const duplicateSlugPlan = structuredClone(catalogReviewPlan);
  duplicateSlugPlan.products[1].slug = duplicateSlugPlan.products[0].slug;

  assert.throws(
    () => validateCatalogReviewPlan(duplicateSlugPlan),
    /duplicate product slug catalog-review-harem-jumpsuit/
  );
});

test("rejects a selected photo outside its visually reviewed product group", () => {
  const mismatchedMediaPlan = structuredClone(catalogReviewPlan);
  mismatchedMediaPlan.products[0].selected_media[0].id = 999_999;

  assert.throws(
    () => validateCatalogReviewPlan(mismatchedMediaPlan),
    /selected media 999999 is not part of harem-jumpsuit/
  );
});

test("rejects one selected photo assigned to multiple product drafts", () => {
  const duplicatedPhotoPlan = structuredClone(catalogReviewPlan);
  const shared = duplicatedPhotoPlan.products[0].selected_media[0];
  duplicatedPhotoPlan.products[1].all_media_ids.push(shared.id);
  duplicatedPhotoPlan.products[1].selected_media[0] = structuredClone(shared);

  assert.throws(
    () => validateCatalogReviewPlan(duplicatedPhotoPlan),
    /selected media 260 is assigned to both harem-jumpsuit and olive-pattern-harem-pants/
  );
});

test("builds review cards with public thumbnail URLs and photo counts", () => {
  const cards = buildCatalogReviewCards(
    validateCatalogReviewPlan(catalogReviewPlan)
  );

  assert.equal(cards.length, 13);
  assert.deepEqual(cards[0], {
    key: "harem-jumpsuit",
    name: "Flowing Harem Jumpsuit",
    description:
      "Flowing harem-leg jumpsuit photographed in teal, crimson, and rust paisley groups. Final pattern names, sizing, fabric, care, and price require review.",
    confidence: "medium",
    selectedPhotoCount: 12,
    groupedPhotoCount: catalogReviewPlan.products[0].all_media_ids.length,
    photoURLs: catalogReviewPlan.products[0].selected_media.map(
      (media) => `/api/media/file/${encodeURIComponent(media.filename)}`
    ),
    notes: catalogReviewPlan.products[0].notes,
  });
});
