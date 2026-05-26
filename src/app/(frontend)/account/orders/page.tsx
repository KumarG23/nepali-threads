import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPriceCents } from "@/lib/format";
import config from "@payload-config";

import type { Order } from "@/payload-types";

export const dynamic = "force-dynamic";

function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

function lineItemSummary(order: Order): string {
  const pieces =
    order.lineItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const pieceLabel = pieces === 1 ? "piece" : "pieces";
  return `${pieces} ${pieceLabel} · ${formatPriceCents(order.total)}`;
}

export default async function OrdersPage() {
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  const result = await payload.find({
    collection: "orders",
    where: { customer: { equals: user.id } },
    sort: "-createdAt",
    limit: 100,
    user,
  });

  const orders = result.docs as Order[];

  return (
    <article className="mx-auto max-w-2xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Order history
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">Your orders.</h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        All your past orders, newest first.
      </p>

      {orders.length === 0 ? (
        <p className="font-sans text-body text-neutral-ink/70">
          You haven&apos;t placed an order yet. Head to the{" "}
          <a
            href="/shop"
            className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
          >
            shop
          </a>{" "}
          to find something.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} variant="bordered" padding="md">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-sans text-small font-medium text-neutral-ink">
                    Order #{order.id}
                  </p>
                  <p className="font-sans text-small text-neutral-ink/60">
                    {formatOrderDate(order.createdAt)}
                  </p>
                </div>
                <Badge variant={orderStatusVariant(order.status)} size="sm">
                  {order.status}
                </Badge>
              </div>
              <p className="font-sans text-small text-neutral-ink/70 mb-1">
                {fulfillmentLine(order)}
              </p>
              <p className="font-sans text-body font-medium text-neutral-ink">
                {lineItemSummary(order)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </article>
  );
}
