import assert from "node:assert/strict";
import test from "node:test";

import catalogReviewPlan from "../src/data/catalog-review-plan.json" with {
  type: "json",
};
import { applyCatalogReviewDrafts } from "../src/lib/catalog-review/import";
import { validateCatalogReviewPlan } from "../src/lib/catalog-review/plan";

function selectedMediaDocs() {
  return catalogReviewPlan.products.flatMap((product) =>
    product.selected_media.map((media) => ({
      id: media.id,
      filename: media.filename,
      alt: null,
    }))
  );
}

test("rejects a missing review category before opening a transaction", async () => {
  let beginCalls = 0;
  const payload = {
    findByID: async () => null,
    find: async () => ({ docs: [], totalDocs: 0 }),
    create: async () => ({}),
    update: async () => ({}),
    db: {
      beginTransaction: async () => {
        beginCalls += 1;
        return "tx-never";
      },
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
    },
  };

  await assert.rejects(
    () =>
      applyCatalogReviewDrafts({
        payload,
        plan: validateCatalogReviewPlan(catalogReviewPlan),
        req: { user: { id: 1, collection: "users" } },
      }),
    /required catalog review category changed/
  );
  assert.equal(beginCalls, 0);
});

test("rejects a changed live media filename before opening a transaction", async () => {
  const mediaDocs = selectedMediaDocs();
  mediaDocs[0].filename = "unexpected-file.jpg";
  let beginCalls = 0;
  let writeCalls = 0;

  const payload = {
    findByID: async () => ({
      id: 1,
      name: "Test Category",
      slug: "test-category",
    }),
    find: async (args: Record<string, unknown>) => {
      const collection = String(args.collection);
      return {
        docs: collection === "media" ? mediaDocs : [],
        totalDocs: collection === "media" ? mediaDocs.length : 0,
      };
    },
    create: async () => {
      writeCalls += 1;
      return {};
    },
    update: async () => {
      writeCalls += 1;
      return {};
    },
    db: {
      beginTransaction: async () => {
        beginCalls += 1;
        return "tx-1";
      },
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
    },
  };

  await assert.rejects(
    () =>
      applyCatalogReviewDrafts({
        payload,
        plan: validateCatalogReviewPlan(catalogReviewPlan),
        req: { user: { id: 1, collection: "users" } },
      }),
    /media 260 filename changed from Facetune_11-06-2024-18-51-27\.jpeg to unexpected-file\.jpg/
  );
  assert.equal(beginCalls, 0);
  assert.equal(writeCalls, 0);
});

test("creates every review product as a draft in one transaction and reads it back", async () => {
  const mediaDocs = selectedMediaDocs();
  const products: Array<Record<string, unknown>> = [];
  const createInputs: Array<Record<string, unknown>> = [];
  let commitCalls = 0;
  let rollbackCalls = 0;

  const payload = {
    findByID: async () => ({
      id: 1,
      name: "Test Category",
      slug: "test-category",
    }),
    find: async (args: Record<string, unknown>) => {
      const collection = String(args.collection);
      return {
        docs: collection === "media" ? mediaDocs : products,
        totalDocs: collection === "media" ? mediaDocs.length : products.length,
      };
    },
    create: async (args: Record<string, unknown>) => {
      createInputs.push(args);
      const doc = {
        id: 1_000 + products.length,
        ...(args.data as Record<string, unknown>),
      };
      products.push(doc);
      return doc;
    },
    update: async () => {
      throw new Error("unexpected update");
    },
    db: {
      beginTransaction: async () => "tx-1",
      commitTransaction: async () => {
        commitCalls += 1;
      },
      rollbackTransaction: async () => {
        rollbackCalls += 1;
      },
    },
  };
  const req: Record<string, unknown> = {
    user: { id: 1, collection: "users", role: "admin" },
  };

  const result = await applyCatalogReviewDrafts({
    payload,
    plan: validateCatalogReviewPlan(catalogReviewPlan),
    req,
  });

  assert.equal(result.created.length, 13);
  assert.equal(result.preserved.length, 0);
  assert.equal(result.drafts.length, 13);
  assert.equal(commitCalls, 1);
  assert.equal(rollbackCalls, 0);
  assert.equal(req.transactionID, undefined);
  assert.ok(
    createInputs.every(
      (input) =>
        input.collection === "products" &&
        input.overrideAccess === false &&
        (input.req as Record<string, unknown>).transactionID === "tx-1" &&
        (input.data as Record<string, unknown>).status === "draft" &&
        (input.data as Record<string, unknown>).basePrice === 0
    )
  );
});

test("rolls back earlier drafts when a later product write fails", async () => {
  const mediaDocs = selectedMediaDocs();
  const products: Array<Record<string, unknown>> = [];
  let createCalls = 0;
  let commitCalls = 0;
  let rollbackCalls = 0;

  const payload = {
    findByID: async () => ({
      id: 1,
      name: "Test Category",
      slug: "test-category",
    }),
    find: async (args: Record<string, unknown>) => {
      const collection = String(args.collection);
      return {
        docs: collection === "media" ? mediaDocs : products,
        totalDocs: collection === "media" ? mediaDocs.length : products.length,
      };
    },
    create: async (args: Record<string, unknown>) => {
      createCalls += 1;
      if (createCalls === 3) {
        throw new Error("forced later write failure");
      }
      const doc = {
        id: 2_000 + products.length,
        ...(args.data as Record<string, unknown>),
      };
      products.push(doc);
      return doc;
    },
    update: async () => {
      throw new Error("unexpected update");
    },
    db: {
      beginTransaction: async () => "tx-failure",
      commitTransaction: async () => {
        commitCalls += 1;
      },
      rollbackTransaction: async () => {
        rollbackCalls += 1;
        products.length = 0;
      },
    },
  };

  await assert.rejects(
    () =>
      applyCatalogReviewDrafts({
        payload,
        plan: validateCatalogReviewPlan(catalogReviewPlan),
        req: { user: { id: 1, collection: "users", role: "admin" } },
      }),
    /forced later write failure/
  );

  assert.equal(createCalls, 3);
  assert.equal(commitCalls, 0);
  assert.equal(rollbackCalls, 1);
  assert.equal(products.length, 0);
});
