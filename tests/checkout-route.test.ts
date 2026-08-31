import assert from "node:assert/strict";
import { mock, test } from "node:test";

const products = [
  {
    id: 101,
    name: "Crimson Romper",
    slug: "crimson-romper",
    basePrice: 6000,
    inventoryCount: 10,
    images: [],
    status: "published",
  },
];
let variants: Array<Record<string, unknown>> = [];
let stripeCreateCalls = 0;
let lastStripeInput: Record<string, unknown> | undefined;

type ModuleMock = (
  specifier: string,
  options: { defaultExport?: unknown; namedExports?: Record<string, unknown> }
) => void;
const mockModule = (mock as unknown as { module: ModuleMock }).module.bind(mock);

mockModule("@payload-config", { defaultExport: {} });
mockModule("payload", {
  namedExports: {
    getPayload: async () => ({
      find: async ({ collection }: { collection: string }) => ({
        docs: collection === "products" ? products : variants,
      }),
    }),
  },
});
mockModule("@/lib/stripe/client", {
  namedExports: {
    getStripe: () => ({
      checkout: {
        sessions: {
          create: async (input: Record<string, unknown>) => {
            stripeCreateCalls += 1;
            lastStripeInput = input;
            return { url: "https://checkout.stripe.test/session" };
          },
        },
      },
    }),
  },
});

const { POST } = await import("../src/app/api/checkout/route");

function checkoutRequest(productId = 101): Request {
  return new Request("https://nepali-threads.test/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "nepali-threads.test",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }] }),
  });
}

test("checkout rejects an omitted variant when the product has variants", async () => {
  variants = [
    {
      id: 501,
      product: 101,
      sku: "NT-0501",
      color: "Crimson",
      price: 7500,
      inventoryCount: 0,
      images: [],
    },
  ];
  stripeCreateCalls = 0;

  const response = await POST(checkoutRequest());
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: "Please select an available variant for each item with size or color options.",
  });
  assert.equal(stripeCreateCalls, 0);
});

test("checkout accepts an omitted variant for a product with no variants", async () => {
  variants = [];
  stripeCreateCalls = 0;
  lastStripeInput = undefined;

  const response = await POST(checkoutRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    url: "https://checkout.stripe.test/session",
  });
  assert.equal(stripeCreateCalls, 1);
  const stripeInput = lastStripeInput as Record<string, unknown> | undefined;
  assert.ok(stripeInput);
  const [lineItem] = stripeInput.line_items as Array<{
    price_data: { unit_amount: number };
  }>;
  assert.equal(lineItem.price_data.unit_amount, 6000);
});
