// LOCAL-LLM: DO NOT EDIT
//
// POST /api/webhooks/stripe — Stripe sends server-to-server events here.
// Verifies the signature against STRIPE_WEBHOOK_SECRET, then dispatches by
// event type. Only checkout.session.completed creates an Order today;
// other event types (charge.refunded, payment_intent.payment_failed, etc.)
// are acknowledged with 200 but not yet handled.
//
// This is the durable counterpart to /cart/success — Stripe retries failed
// webhook deliveries with exponential backoff for ~3 days, so orders get
// created even when the customer closes the tab before the success-page
// redirect completes. Both paths use the same persistStripeOrder helper
// (idempotent via stripePaymentIntentId), so whichever fires first wins.

import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { persistStripeOrder } from "@/lib/orders/persist-stripe-order";
import { stripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  // Stripe needs the RAW request body for signature verification —
  // any JSON parsing breaks the signature. Read text() directly.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Invalid signature", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const sessionStub = event.data.object as Stripe.Checkout.Session;
    // The webhook payload's session doesn't have line_items expanded.
    // Re-fetch with expansion so persistStripeOrder has the data it
    // needs (line items, payment intent).
    try {
      const session = await stripe.checkout.sessions.retrieve(
        sessionStub.id,
        { expand: ["line_items", "payment_intent"] }
      );
      if (session.payment_status === "paid") {
        const result = await persistStripeOrder(session);
        console.log("[stripe-webhook] checkout.session.completed", {
          sessionId: session.id,
          result,
        });
      } else {
        console.log("[stripe-webhook] session not paid, skipping", {
          sessionId: session.id,
          payment_status: session.payment_status,
        });
      }
    } catch (err) {
      console.error(
        "[stripe-webhook] Error handling completed session",
        err
      );
      // Return 500 so Stripe retries — likely transient (DB blip, etc.).
      return NextResponse.json(
        { error: "Processing failed" },
        { status: 500 }
      );
    }
  } else {
    // Other event types: ack with 200 so Stripe doesn't retry. Add
    // handlers for charge.refunded, payment_intent.payment_failed, etc.
    // in future tasks as needed.
    console.log("[stripe-webhook] unhandled event type", event.type);
  }

  return NextResponse.json({ received: true });
}
