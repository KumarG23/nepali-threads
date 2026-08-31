// LOCAL-LLM: DO NOT EDIT
//
// POST /api/checkout — creates a Stripe Checkout Session from a cart payload
// and returns the hosted-checkout URL. The browser may send product IDs,
// variant IDs, and quantities only; all Stripe line item names/prices/images
// are fetched server-side from Payload so the client cannot tamper with
// checkout price. Products with variants require a valid variantId; genuine
// base products fall back to basePrice + optional product-level inventory.
// Out-of-stock products and variants are rejected with a 409.

import { getPayload } from "payload";
import { NextResponse } from "next/server";

import config from "@payload-config";
import type { Product, ProductVariant } from "@/payload-types";
import { isInventoryAvailable } from "@/lib/inventory-availability";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

const MAX_DISTINCT_ITEMS = 20;
const MAX_QUANTITY_PER_ITEM = 99;

type CheckoutRequestItem = {
  productId: number;
  variantId?: number;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutRequestItem[];
};

type AuthoritativeCheckoutItem = {
  productId: number;
  variantId?: number;
  productSlug: string;
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  sku?: string;
};

// Compact metadata snapshot (Stripe metadata values cap at 500 chars).
// Single-letter keys keep typical 3-line orders well under the limit.
type ProductSnapshotMetadata = {
  p: number; // productId
  v?: number; // variantId
  n: string; // name (incl. variant suffix)
  q: number; // quantity
  c: number; // priceCents
  s?: string; // sku
};

function isCheckoutItem(value: unknown): value is CheckoutRequestItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    !Number.isInteger(v.productId) ||
    Number(v.productId) <= 0 ||
    !Number.isInteger(v.quantity) ||
    Number(v.quantity) <= 0 ||
    Number(v.quantity) > MAX_QUANTITY_PER_ITEM
  ) {
    return false;
  }
  // variantId is optional but must be a positive integer when present.
  if (v.variantId !== undefined) {
    if (!Number.isInteger(v.variantId) || Number(v.variantId) <= 0) {
      return false;
    }
  }
  return true;
}

// Two distinct color+size combos of the same product must remain
// separate line items. Consolidate on (productId, variantId).
function consolidateItems(items: CheckoutRequestItem[]): CheckoutRequestItem[] {
  const keyOf = (productId: number, variantId?: number) =>
    `${productId}:${variantId ?? "base"}`;

  const byKey = new Map<
    string,
    { productId: number; variantId?: number; quantity: number }
  >();

  for (const item of items) {
    const key = keyOf(item.productId, item.variantId);
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      byKey.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }
  }

  return [...byKey.values()].map((entry) => ({
    productId: entry.productId,
    variantId: entry.variantId,
    quantity: Math.min(entry.quantity, MAX_QUANTITY_PER_ITEM),
  }));
}

function storefrontOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return "";

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function absoluteUrl(origin: string, value: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    if (!origin || !value.startsWith("/")) return undefined;
    return `${origin}${value}`;
  }
}

function firstProductImage(product: Product): { url: string; alt: string } {
  const image = product.images?.[0]?.image;
  if (image && typeof image === "object" && image.url) {
    return { url: image.url, alt: image.alt ?? product.name };
  }
  return { url: "", alt: product.name };
}

function firstVariantImage(
  variant: ProductVariant
): { url: string; alt: string } | null {
  const entry = variant.images?.[0];
  const image = entry?.image;
  if (image && typeof image === "object" && image.url) {
    return { url: image.url, alt: image.alt ?? "" };
  }
  return null;
}

// "Romper — Crimson, Small" / "Romper — Crimson" / "Romper — Small" / "Romper"
function variantDisplayName(product: Product, variant: ProductVariant): string {
  const bits = [variant.color, variant.size].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  if (bits.length === 0) return product.name;
  return `${product.name} — ${bits.join(", ")}`;
}

function toMetadataSnapshot(
  items: AuthoritativeCheckoutItem[]
): ProductSnapshotMetadata[] {
  return items.map((item) => {
    const snapshot: ProductSnapshotMetadata = {
      p: item.productId,
      n: item.name,
      q: item.quantity,
      c: item.priceCents,
    };
    if (item.variantId !== undefined) snapshot.v = item.variantId;
    if (item.sku) snapshot.s = item.sku;
    return snapshot;
  });
}

async function resolveCheckoutItems(
  rawItems: CheckoutRequestItem[]
): Promise<AuthoritativeCheckoutItem[]> {
  const items = consolidateItems(rawItems);
  if (items.length > MAX_DISTINCT_ITEMS) {
    throw new Error("too_many_items");
  }

  const payload = await getPayload({ config });

  const productIds = [...new Set(items.map((item) => item.productId))];
  const variantIds = [
    ...new Set(
      items
        .map((item) => item.variantId)
        .filter((id): id is number => typeof id === "number")
    ),
  ];
  const baseProductIds = [
    ...new Set(
      items
        .filter((item) => item.variantId === undefined)
        .map((item) => item.productId)
    ),
  ];

  const [productResult, variantResult, ...variantPresenceResults] =
    await Promise.all([
      payload.find({
        collection: "products",
        where: {
          and: [
            { id: { in: productIds } },
            { status: { equals: "published" } },
          ],
        },
        limit: productIds.length,
        depth: 1,
      }),
      variantIds.length > 0
        ? payload.find({
            collection: "product-variants",
            where: { id: { in: variantIds } },
            limit: variantIds.length,
            depth: 1,
          })
        : Promise.resolve({ docs: [] as ProductVariant[] }),
      ...baseProductIds.map((productId) =>
        payload.find({
          collection: "product-variants",
          where: { product: { equals: productId } },
          limit: 1,
          depth: 0,
        })
      ),
    ]);

  const productsById = new Map(
    (productResult.docs as Product[]).map((product) => [product.id, product])
  );
  const variantsById = new Map(
    (variantResult.docs as ProductVariant[]).map((variant) => [
      variant.id,
      variant,
    ])
  );
  const productsWithVariants = new Set(
    baseProductIds.filter(
      (_productId, index) => variantPresenceResults[index].docs.length > 0
    )
  );

  return items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("unavailable_product");

    if (item.variantId !== undefined) {
      const variant = variantsById.get(item.variantId);
      if (!variant) throw new Error("unavailable_variant");

      // Security check: the variant must actually belong to the product
      // the client claimed. Without this, a tampered cart could send a
      // cheap variant id with an expensive product id.
      const variantProductId =
        typeof variant.product === "object" && variant.product?.id
          ? variant.product.id
          : variant.product;
      if (variantProductId !== product.id) {
        throw new Error("variant_product_mismatch");
      }

      if (variant.inventoryCount < item.quantity) {
        throw new Error("variant_out_of_stock");
      }

      const variantImage = firstVariantImage(variant);
      const fallbackImage = firstProductImage(product);
      const image = variantImage ?? fallbackImage;

      return {
        productId: product.id,
        variantId: variant.id,
        productSlug: product.slug,
        name: variantDisplayName(product, variant),
        priceCents: variant.price ?? product.basePrice,
        imageSrc: image.url,
        imageAlt: image.alt,
        quantity: item.quantity,
        sku: variant.sku,
      };
    }

    if (productsWithVariants.has(product.id)) {
      throw new Error("variant_required");
    }

    // Plain product (no variants exist). Product-level inventory is optional;
    // when it is tracked, reject carts that exceed the current count.
    if (!isInventoryAvailable(product.inventoryCount, item.quantity)) {
      throw new Error("product_out_of_stock");
    }

    const image = firstProductImage(product);
    return {
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      priceCents: product.basePrice,
      imageSrc: image.url,
      imageAlt: image.alt,
      quantity: item.quantity,
    };
  });
}

function errorResponseFor(message: string) {
  switch (message) {
    case "too_many_items":
      return {
        status: 400,
        error: "Cart contains too many distinct items.",
      };
    case "variant_product_mismatch":
      return {
        status: 400,
        error: "Cart contains an invalid variant reference.",
      };
    case "variant_required":
      return {
        status: 400,
        error:
          "Please select an available variant for each item with size or color options.",
      };
    case "variant_out_of_stock":
      return {
        status: 409,
        error:
          "One or more items in your cart are out of stock at the size or color you picked.",
      };
    case "product_out_of_stock":
      return {
        status: 409,
        error: "One or more items in your cart are out of stock.",
      };
    case "unavailable_variant":
    case "unavailable_product":
    default:
      return {
        status: 409,
        error: "One or more items in your cart are no longer available.",
      };
  }
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items : null;
  if (!rawItems || rawItems.length === 0) {
    return NextResponse.json(
      { error: "Cart is empty." },
      { status: 400 }
    );
  }

  if (!rawItems.every(isCheckoutItem)) {
    return NextResponse.json(
      { error: "Cart contains invalid items." },
      { status: 400 }
    );
  }

  let items: AuthoritativeCheckoutItem[];
  try {
    items = await resolveCheckoutItems(rawItems);
  } catch (err) {
    const message = err instanceof Error ? err.message : "resolve_failed";
    const { status, error } = errorResponseFor(message);
    return NextResponse.json({ error }, { status });
  }

  const origin = storefrontOrigin(request);
  if (!origin) {
    return NextResponse.json(
      { error: "Could not determine storefront URL." },
      { status: 500 }
    );
  }

  const productSnapshot = JSON.stringify(toMetadataSnapshot(items));
  if (productSnapshot.length > 500) {
    return NextResponse.json(
      { error: "Cart is too large for checkout. Please split it into smaller orders." },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: items.map((item) => {
        const imageUrl = absoluteUrl(origin, item.imageSrc);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              images: imageUrl ? [imageUrl] : undefined,
            },
            unit_amount: item.priceCents,
          },
          quantity: item.quantity,
        };
      }),
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        productSnapshot,
      },
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error", err);
    return NextResponse.json(
      { error: "Could not create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
