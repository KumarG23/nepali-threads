// LOCAL-LLM: DO NOT EDIT
//
// Inventory decrement called from persistStripeOrder once an Order is
// created. Walks each line item, finds the variant (or product if no
// variant was tied to the line), and reduces the inventoryCount by the
// quantity sold.
//
// Concurrency model: checkout gates tracked product and variant inventory — if
// a row has inventory < quantity, the checkout session is refused (HTTP 409).
// A theoretical race remains where two buyers create checkout sessions at the
// same moment, both pass the gate, both pay, and the second decrement
// would push us below zero. We clamp at zero and log a structured
// warning so the operator can spot it in Vercel logs and refund manually.
// Hard-locking inventory across the Stripe payment window is out of
// scope for launch — this is the simplest correct behavior for a low-
// volume artisan shop.

import type { Payload } from "payload";

type LineItemForDecrement = {
  productId: number;
  variantId?: number;
  quantity: number;
};

export type DecrementInventoryResult = {
  variantDecrements: number;
  productDecrements: number;
  oversells: number;
  skipped: number;
};

interface DecrementArgs {
  payload: Payload;
  orderId: number | string;
  lineItems: LineItemForDecrement[];
}

// Decrement inventory for an order's line items. Never throws — failures
// are logged and reported in the result so the caller (persistStripeOrder)
// can decide whether to surface them. The order itself is already
// persisted; inventory drift is recoverable in admin.
export async function decrementInventoryForOrder({
  payload,
  orderId,
  lineItems,
}: DecrementArgs): Promise<DecrementInventoryResult> {
  let variantDecrements = 0;
  let productDecrements = 0;
  let oversells = 0;
  let skipped = 0;

  for (const item of lineItems) {
    if (item.variantId !== undefined) {
      const result = await decrementVariant({
        payload,
        orderId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
      if (result === "ok") variantDecrements += 1;
      else if (result === "oversell") oversells += 1;
      else skipped += 1;
      continue;
    }

    const result = await decrementProductIfTracked({
      payload,
      orderId,
      productId: item.productId,
      quantity: item.quantity,
    });
    if (result === "ok") productDecrements += 1;
    else if (result === "oversell") oversells += 1;
    else skipped += 1;
  }

  if (oversells > 0) {
    payload.logger.warn(
      { orderId, oversells, lineItems },
      "[inventory] Oversell detected — one or more rows would have gone below zero; clamped to 0. Refund or restock manually."
    );
  }

  return { variantDecrements, productDecrements, oversells, skipped };
}

type DecrementOutcome = "ok" | "oversell" | "skipped";

async function decrementVariant({
  payload,
  orderId,
  variantId,
  quantity,
}: {
  payload: Payload;
  orderId: number | string;
  variantId: number;
  quantity: number;
}): Promise<DecrementOutcome> {
  try {
    const variant = await payload.findByID({
      collection: "product-variants",
      id: variantId,
      depth: 0,
      overrideAccess: true,
    });

    const current = variant.inventoryCount;
    if (typeof current !== "number") {
      payload.logger.warn(
        { orderId, variantId },
        "[inventory] Variant has no inventoryCount; skipping decrement"
      );
      return "skipped";
    }

    const nextCount = current - quantity;
    const clamped = Math.max(0, nextCount);
    const oversold = nextCount < 0;

    await payload.update({
      collection: "product-variants",
      id: variantId,
      data: { inventoryCount: clamped },
      overrideAccess: true,
    });

    return oversold ? "oversell" : "ok";
  } catch (err) {
    payload.logger.error(
      { orderId, variantId, err },
      "[inventory] Variant decrement failed"
    );
    return "skipped";
  }
}

async function decrementProductIfTracked({
  payload,
  orderId,
  productId,
  quantity,
}: {
  payload: Payload;
  orderId: number | string;
  productId: number;
  quantity: number;
}): Promise<DecrementOutcome> {
  try {
    const product = await payload.findByID({
      collection: "products",
      id: productId,
      depth: 0,
      overrideAccess: true,
    });

    const current = product.inventoryCount;
    // Products with NULL inventoryCount are "not tracked" — leave them
    // alone. The operator has explicitly opted out of inventory for those.
    if (typeof current !== "number") {
      return "skipped";
    }

    const nextCount = current - quantity;
    const clamped = Math.max(0, nextCount);
    const oversold = nextCount < 0;

    await payload.update({
      collection: "products",
      id: productId,
      data: { inventoryCount: clamped },
      overrideAccess: true,
    });

    return oversold ? "oversell" : "ok";
  } catch (err) {
    payload.logger.error(
      { orderId, productId, err },
      "[inventory] Product decrement failed"
    );
    return "skipped";
  }
}
