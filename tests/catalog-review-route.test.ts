import assert from "node:assert/strict";
import { mock, test } from "node:test";

import catalogReviewPlan from "../src/data/catalog-review-plan.json" with {
  type: "json",
};

type ModuleMock = (
  specifier: string,
  options: { defaultExport?: unknown; namedExports?: Record<string, unknown> }
) => void;
const mockModule = (mock as unknown as { module: ModuleMock }).module.bind(mock);

let authUser: Record<string, unknown> | null = null;
let findCalls = 0;
let createCalls = 0;
let updateCalls = 0;
let commitCalls = 0;
process.env.PAYLOAD_PUBLIC_SERVER_URL = "https://nepali-threads.test";
const products: Array<Record<string, unknown>> = [];
const mediaDocs = catalogReviewPlan.products.flatMap((product) =>
  product.selected_media.map((media) => ({
    id: media.id,
    filename: media.filename,
    alt: null,
  }))
);

mockModule("@payload-config", { defaultExport: {} });
mockModule("payload", {
  namedExports: {
    createLocalReq: async ({ user }: { user: Record<string, unknown> }) => ({
      user,
    }),
    getPayload: async () => ({
      auth: async () => ({ user: authUser }),
      findByID: async () => {
        findCalls += 1;
        return { id: 1, name: "Test Category", slug: "test-category" };
      },
      find: async ({ collection }: { collection: string }) => {
        findCalls += 1;
        const docs = collection === "media" ? mediaDocs : products;
        return { docs, totalDocs: docs.length };
      },
      create: async (args: Record<string, unknown>) => {
        createCalls += 1;
        const doc = {
          id: 1_000 + products.length,
          ...(args.data as Record<string, unknown>),
        };
        products.push(doc);
        return doc;
      },
      update: async (args: Record<string, unknown>) => {
        updateCalls += 1;
        const index = products.findIndex((product) => product.id === args.id);
        const doc = {
          ...products[index],
          ...(args.data as Record<string, unknown>),
        };
        products[index] = doc;
        return doc;
      },
      db: {
        beginTransaction: async () => "tx-route",
        commitTransaction: async () => {
          commitCalls += 1;
        },
        rollbackTransaction: async () => undefined,
      },
    }),
  },
});

const { POST } = await import(
  "../src/app/api/admin/catalog-review/route"
);

function request(
  origin = "https://nepali-threads.test",
  url = "https://nepali-threads.test/api/admin/catalog-review"
): Request {
  return new Request(url, {
    method: "POST",
    headers: { origin },
  });
}

test("catalog review import rejects an unauthenticated request before catalog access", async () => {
  authUser = null;
  findCalls = 0;

  const response = await POST(request());

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Admin sign-in required." });
  assert.equal(findCalls, 0);
});

test("catalog review import trusts only the configured public origin", async () => {
  authUser = null;

  const response = await POST(
    request(
      "https://nepali-threads.test",
      "http://localhost:3000/api/admin/catalog-review"
    )
  );

  assert.equal(response.status, 401);
});

test("catalog review import rejects a read-only viewer", async () => {
  authUser = { id: 2, collection: "users", role: "viewer" };
  findCalls = 0;

  const response = await POST(request());

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Catalog review requires an admin account.",
  });
  assert.equal(findCalls, 0);
});

test("catalog review import rejects a cross-origin admin request", async () => {
  authUser = { id: 1, collection: "users", role: "admin" };
  findCalls = 0;

  const response = await POST(request("https://attacker.test"));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Invalid request origin." });
  assert.equal(findCalls, 0);
});

test("catalog review import creates draft products for a signed-in admin", async () => {
  authUser = { id: 1, collection: "users", role: "admin" };
  products.length = 0;
  createCalls = 0;
  commitCalls = 0;

  const response = await POST(request());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    created: 13,
    preserved: 0,
    drafts: 13,
    reviewUrl: "/admin/collections/products",
  });
  assert.equal(createCalls, 13);
  assert.equal(commitCalls, 1);
  assert.ok(products.every((product) => product.status === "draft"));
});

test("catalog review import preserves edits on replay", async () => {
  authUser = { id: 1, collection: "users", role: "admin" };
  products.length = 0;
  createCalls = 0;
  updateCalls = 0;

  const firstResponse = await POST(request());
  assert.equal(firstResponse.status, 200);
  products[0] = {
    ...products[0],
    name: "Reviewed Harem Jumpsuit",
    basePrice: 7_500,
    inventoryCount: 3,
  };

  createCalls = 0;
  updateCalls = 0;
  const secondResponse = await POST(request());

  assert.equal(secondResponse.status, 200);
  assert.deepEqual(await secondResponse.json(), {
    created: 0,
    preserved: 13,
    drafts: 13,
    reviewUrl: "/admin/collections/products",
  });
  assert.equal(createCalls, 0);
  assert.equal(updateCalls, 0);
  assert.equal(products.length, 13);
  assert.equal(products[0].name, "Reviewed Harem Jumpsuit");
  assert.equal(products[0].basePrice, 7_500);
  assert.equal(products[0].inventoryCount, 3);
});

test("catalog review import refuses to touch an already-published review slug", async () => {
  authUser = { id: 1, collection: "users", role: "admin" };
  products.length = 0;
  const firstResponse = await POST(request());
  assert.equal(firstResponse.status, 200);
  products[0] = { ...products[0], status: "published" };
  createCalls = 0;
  updateCalls = 0;

  const response = await POST(request());

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "Catalog changed since the photo scan. Refresh the review plan before importing.",
  });
  assert.equal(createCalls, 0);
  assert.equal(updateCalls, 0);
  assert.equal(products[0].status, "published");
});

test("catalog review import reports a stale media plan without leaking internals", async () => {
  authUser = { id: 1, collection: "users", role: "admin" };
  products.length = 0;
  createCalls = 0;
  const originalFilename = mediaDocs[0].filename;
  mediaDocs[0].filename = "changed-on-server.jpg";

  try {
    const response = await POST(request());

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "Catalog changed since the photo scan. Refresh the review plan before importing.",
    });
    assert.equal(createCalls, 0);
  } finally {
    mediaDocs[0].filename = originalFilename;
  }
});
