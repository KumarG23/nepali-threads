import {
  buildCatalogReviewDrafts,
  type CatalogReviewPlan,
} from "./plan";

export class CatalogReviewPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogReviewPreflightError";
  }
}

export type CatalogReviewPayload = {
  findByID: (
    args: Record<string, unknown>
  ) => Promise<null | Record<string, unknown>>;
  find: (args: Record<string, unknown>) => Promise<{
    docs: Array<Record<string, unknown>>;
    totalDocs?: number;
  }>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  db: {
    beginTransaction: () => Promise<null | number | string>;
    commitTransaction: (transactionID: number | string) => Promise<void>;
    rollbackTransaction: (transactionID: number | string) => Promise<void>;
  };
};

type CatalogReviewImportArgs = {
  payload: CatalogReviewPayload;
  plan: CatalogReviewPlan;
  req: Record<string, unknown>;
};

export type CatalogReviewImportResult = {
  created: Array<Record<string, unknown>>;
  preserved: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
};

function assertDraftReadBack(
  docs: Array<Record<string, unknown>>,
  expectedSlugs: string[],
  newSlugs: Set<string>
): void {
  const expected = new Set(expectedSlugs);
  const actual = new Set(docs.map((doc) => String(doc.slug)));
  if (docs.length !== expectedSlugs.length || actual.size !== expected.size) {
    throw new Error("catalog review draft read-back count does not match the plan");
  }
  for (const slug of expected) {
    if (!actual.has(slug)) {
      throw new Error(`catalog review draft ${slug} is missing after write`);
    }
  }
  for (const doc of docs) {
    const slug = String(doc.slug);
    if (doc.status !== "draft") {
      throw new Error(`catalog review draft ${slug} is not safely staged`);
    }
    if (
      newSlugs.has(slug) &&
      (doc.featured !== false ||
        doc.basePrice !== 0 ||
        doc.inventoryCount !== null)
    ) {
      throw new Error(`catalog review draft ${slug} is not safely staged`);
    }
  }
}

export async function applyCatalogReviewDrafts({
  payload,
  plan,
  req,
}: CatalogReviewImportArgs): Promise<CatalogReviewImportResult> {
  const category = await payload.findByID({
    collection: "categories",
    id: plan.required_category.id,
    depth: 0,
    disableErrors: true,
    overrideAccess: false,
    req,
  });
  if (
    !category ||
    category.id !== plan.required_category.id ||
    category.name !== plan.required_category.name ||
    category.slug !== plan.required_category.slug
  ) {
    throw new CatalogReviewPreflightError(
      "required catalog review category changed"
    );
  }

  const selectedMedia = plan.products.flatMap((product) => product.selected_media);
  const mediaResult = await payload.find({
    collection: "media",
    where: { id: { in: selectedMedia.map((media) => media.id) } },
    limit: selectedMedia.length,
    depth: 0,
    overrideAccess: false,
    req,
  });
  const liveMediaByID = new Map(mediaResult.docs.map((media) => [media.id, media]));

  for (const expectedMedia of selectedMedia) {
    const liveMedia = liveMediaByID.get(expectedMedia.id);
    if (!liveMedia) {
      throw new CatalogReviewPreflightError(`media ${expectedMedia.id} is missing`);
    }
    if (liveMedia.filename !== expectedMedia.filename) {
      throw new CatalogReviewPreflightError(
        `media ${expectedMedia.id} filename changed from ${expectedMedia.filename} to ${String(liveMedia.filename)}`
      );
    }
  }

  const drafts = buildCatalogReviewDrafts(plan);
  const slugs = drafts.map((draft) => draft.slug);
  const existingResult = await payload.find({
    collection: "products",
    where: { slug: { in: slugs } },
    limit: drafts.length,
    depth: 0,
    overrideAccess: false,
    req,
  });
  const existingBySlug = new Map(
    existingResult.docs.map((product) => [String(product.slug), product])
  );
  const preserved = [...existingResult.docs];
  for (const existing of preserved) {
    if (existing.status !== "draft") {
      throw new CatalogReviewPreflightError(
        `existing review product ${String(existing.slug)} is not a draft`
      );
    }
  }

  const draftsToCreate = drafts.filter(
    (draft) => !existingBySlug.has(draft.slug)
  );
  const newSlugs = new Set(draftsToCreate.map((draft) => draft.slug));
  const created: Array<Record<string, unknown>> = [];

  if (draftsToCreate.length > 0) {
    const transactionID = await payload.db.beginTransaction();
    if (transactionID === null) {
      throw new Error("database transactions are unavailable");
    }
    const transactionReq = { ...req, transactionID };

    try {
      for (const draft of draftsToCreate) {
        created.push(
          await payload.create({
            collection: "products",
            data: draft,
            depth: 0,
            overrideAccess: false,
            req: transactionReq,
          })
        );
      }

      const transactionalReadBack = await payload.find({
        collection: "products",
        where: { slug: { in: slugs } },
        limit: drafts.length,
        depth: 0,
        overrideAccess: false,
        req: transactionReq,
      });
      assertDraftReadBack(transactionalReadBack.docs, slugs, newSlugs);
      await payload.db.commitTransaction(transactionID);
    } catch (error) {
      await payload.db.rollbackTransaction(transactionID);
      throw error;
    }
  }

  const finalReadBack = await payload.find({
    collection: "products",
    where: { slug: { in: slugs } },
    limit: drafts.length,
    depth: 0,
    overrideAccess: false,
    req,
  });
  assertDraftReadBack(finalReadBack.docs, slugs, newSlugs);

  return { created, preserved, drafts: finalReadBack.docs };
}
