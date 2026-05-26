import { headers as nextHeaders } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import Image from "@/components/ui/Image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPriceCents } from "@/lib/format";
import config from "@payload-config";

import type { Order, Product, Media } from "@/payload-types";

export const dynamic = "force-dynamic";

// Mirrors the helper in ../page.tsx — extract to src/lib/orders/format.ts
// if a third consumer appears.
function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Mirrors the helper in ../page.tsx — extract to src/lib/orders/format.ts
// if a third consumer appears.
function orderStatusVariant(
  status: Order["status"]
): "neutral" | "primary" | "accent" | "muted" {
  switch (status) {
    case "paid":
      return "accent";
    case "pending":
      return "neutral";
    case "failed":
      return "muted";
    case "refunded":
      return "muted";
    default:
      return "neutral";
  }
}

// Mirrors the helper in ../page.tsx — extract to src/lib/orders/format.ts
// if a third consumer appears.
function fulfillmentLine(order: Order): string {
  switch (order.fulfillmentStatus) {
    case "shipped":
      return order.trackingNumber
        ? `Shipped — tracking: ${order.trackingNumber}`
        : "Shipped";
    case "delivered":
      return "Delivered";
    case "processing":
      return "Processing";
    case "cancelled":
      return "Cancelled";
    case "unfulfilled":
    default:
      return "Unfulfilled";
  }
}

// Mirrors src/lib/email/send-shipping-notification.ts buildTrackingUrl —
// kept in sync manually until a third consumer triggers extraction.
function buildTrackingUrl(
  carrier: string | undefined | null,
  trackingNumber: string | undefined | null
): string | null {
  if (!carrier || !trackingNumber) return null;
  const normalized = carrier.trim().toLowerCase();
  if (normalized.includes("usps"))
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  if (normalized === "ups" || normalized.includes("ups "))
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  if (normalized.includes("fedex"))
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  if (normalized.includes("dhl"))
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
  return null;
}

function getLineItemImage(
  item: NonNullable<Order["lineItems"]>[number]
): { url: string; alt: string } | null {
  if (!item.product || typeof item.product !== "object") return null;
  const product = item.product as Product;
  const firstImage = product.images?.[0]?.image;
  if (!firstImage || typeof firstImage !== "object") return null;
  const media = firstImage as Media;
  if (!media.url) return null;
  return { url: media.url, alt: media.alt ?? product.name };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${id}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  // payload.findByID respects access rules. When the order doesn't
  // belong to this customer, the rule's where filter excludes it and
  // payload throws a "not found" error. notFound() renders the 404.
  // Same outcome as a genuinely-missing id — by design, we don't tell
  // the user whether some-other-id exists.
  let order: Order;
  try {
    order = (await payload.findByID({
      collection: "orders",
      id,
      user,
      depth: 2,
    })) as Order;
  } catch {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      {/* Header */}
      <div className="mb-12">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 font-sans text-small text-neutral-ink/70 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded mb-4"
        >
          ← All orders
        </Link>
        <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-2">
          Order #{order.id}
        </p>
        <h1 className="font-serif text-h1 text-neutral-ink mb-2">
          {formatOrderDate(order.createdAt)}
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant={orderStatusVariant(order.status)} size="sm">
            {order.status}
          </Badge>
          <p className="font-sans text-small text-neutral-ink/70">
            {fulfillmentLine(order)}
          </p>
        </div>
      </div>

      {/* Line items */}
      <section className="mb-12">
        <h2 className="font-serif text-h2 text-neutral-ink mb-6">Items</h2>
        <ul className="divide-y divide-neutral-ink/10">
          {order.lineItems?.map((item, i) => {
            const image = getLineItemImage(item);
            return (
              <li key={i} className="flex gap-4 py-4">
                {image ? (
                  <div className="w-20 shrink-0 sm:w-24">
                    <Image
                      src={image.url}
                      alt={image.alt}
                      aspectRatio="square"
                      rounded="lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-20 shrink-0 rounded-lg bg-neutral-ink/10 sm:w-24" />
                )}
                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-serif text-h3 text-neutral-ink">
                    {item.nameSnapshot}
                  </p>
                  <p className="font-sans text-small text-neutral-ink/70">
                    Quantity: {item.quantity}
                  </p>
                  <p className="font-sans text-body font-medium text-neutral-ink tabular-nums mt-auto">
                    {formatPriceCents(item.priceAtPurchase * item.quantity)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Totals + shipping side-by-side on lg+, stacked on smaller */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-12">
        {/* Totals */}
        <Card variant="bordered" padding="md">
          <h2 className="font-serif text-h3 text-neutral-ink mb-4">Totals</h2>
          <dl className="space-y-2 font-sans text-body">
            <div className="flex justify-between">
              <dt className="text-neutral-ink/70">Subtotal</dt>
              <dd className="text-neutral-ink tabular-nums">
                {formatPriceCents(order.subtotal)}
              </dd>
            </div>
            {order.shipping > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-ink/70">Shipping</dt>
                <dd className="text-neutral-ink tabular-nums">
                  {formatPriceCents(order.shipping)}
                </dd>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-ink/70">Tax</dt>
                <dd className="text-neutral-ink tabular-nums">
                  {formatPriceCents(order.tax)}
                </dd>
              </div>
            )}
            {order.giftCardDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-neutral-ink/70">Gift card</dt>
                <dd className="text-neutral-ink tabular-nums">
                  −{formatPriceCents(order.giftCardDiscount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-ink/10 pt-2 mt-2 font-medium">
              <dt className="text-neutral-ink">Total</dt>
              <dd className="text-neutral-ink tabular-nums">
                {formatPriceCents(order.total)}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Shipping address + tracking */}
        <Card variant="bordered" padding="md">
          <h2 className="font-serif text-h3 text-neutral-ink mb-4">Shipping</h2>
          {order.shippingAddress ? (
            <address className="not-italic font-sans text-body text-neutral-ink leading-relaxed mb-4">
              {order.shippingAddress.recipientName}
              <br />
              {order.shippingAddress.line1}
              <br />
              {order.shippingAddress.line2 && (
                <>
                  {order.shippingAddress.line2}
                  <br />
                </>
              )}
              {order.shippingAddress.city}, {order.shippingAddress.region}{" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country !== "US" &&
                order.shippingAddress.country}
            </address>
          ) : (
            <p className="font-sans text-body text-neutral-ink/60 mb-4">
              No address on file.
            </p>
          )}

          {order.fulfillmentStatus === "shipped" && order.trackingNumber && (
            <div>
              <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-1">
                {order.carrier ?? "Tracking"}
              </p>
              {buildTrackingUrl(order.carrier, order.trackingNumber) ? (
                <a
                  href={buildTrackingUrl(order.carrier, order.trackingNumber)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-body text-brand-red-700 underline underline-offset-2 hover:text-brand-red-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded tabular-nums"
                >
                  {order.trackingNumber} ↗
                </a>
              ) : (
                <p className="font-sans text-body text-neutral-ink tabular-nums">
                  <strong>{order.trackingNumber}</strong>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </article>
  );
}
