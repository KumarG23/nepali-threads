// LOCAL-LLM: DO NOT EDIT
//
// POST /api/checkout — creates a Stripe Checkout Session from a cart payload
// and returns the hosted-checkout URL. The browser may send product IDs and
// quantities only; all Stripe line item names/prices/images are fetched
// server-side from Payload so the client cannot tamper with checkout price.

import { getPayload } from "payload";
import { NextResponse } from "next/server";

import config from "@payload-config";
import type { Product } from "@/payload-types";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

const MAX_DISTINCT_ITEMS = 20;
const MAX_QUANTITY_PER_ITEM = 99;

type CheckoutRequestItem = {
  productId: number;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutRequestItem[];
};

type AuthoritativeCheckoutItem = {
  productId: number;
  productSlug: string;
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
};

type ProductSnapshotMetadata = {
  p: number;
  n: string;
  q: number;
  c: number;
};

function isCheckoutItem(value: unknown): value is CheckoutRequestItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Number.isInteger(v.productId) &&
    Number(v.productId) > 0 &&
    Number.isInteger(v.quantity) &&
    Number(v.quantity) > 0 &&
    Number(v.quantity) <= MAX_QUANTITY_PER_ITEM
  );
}

function consolidateItems(items: CheckoutRequestItem[]): CheckoutRequestItem[] {
  const byProductId = new Map<number, number>();
  for (const item of items) {
    byProductId.set(
      item.productId,
      (byProductId.get(item.productId) ?? 0) + item.quantity
    );
  }

  return [...byProductId.entries()].map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(quantity, MAX_QUANTITY_PER_ITEM),
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

function toMetadataSnapshot(
  items: AuthoritativeCheckoutItem[]
): ProductSnapshotMetadata[] {
  return items.map((item) => ({
    p: item.productId,
    n: item.name,
    q: item.quantity,
    c: item.priceCents,
  }));
}

async function resolveCheckoutItems(
  rawItems: CheckoutRequestItem[]
): Promise<AuthoritativeCheckoutItem[]> {
  const items = consolidateItems(rawItems);
  if (items.length > MAX_DISTINCT_ITEMS) {
    throw new Error("too_many_items");
  }

  const productIds = items.map((item) => item.productId);
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "products",
    where: {
      and: [
        { id: { in: productIds } },
        { status: { equals: "published" } },
      ],
    },
    limit: productIds.length,
    depth: 1,
  });

  const productsById = new Map(
    (result.docs as Product[]).map((product) => [product.id, product])
  );

  return items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("unavailable_product");
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
    const status = message === "too_many_items" ? 400 : 409;
    return NextResponse.json(
      {
        error:
          message === "too_many_items"
            ? "Cart contains too many distinct items."
            : "One or more items in your cart are no longer available.",
      },
      { status }
    );
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
