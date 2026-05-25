// LOCAL-LLM: DO NOT EDIT
//
// Sends an order-confirmation email via Resend after a successful order
// is persisted to Payload. Called once per order from inside
// persistStripeOrder (only on the created=true branch, so idempotency
// of order creation extends to email).
//
// The function NEVER throws to the caller. Email failures are logged and
// returned as a structured result — order persistence MUST NOT fail
// because Resend had a hiccup.

import { Resend } from "resend";

import { formatPriceCents } from "@/lib/format";

type LineItemInput = {
  name: string;
  quantity: number;
  priceCents: number; // price per unit, integer cents
};

type ShippingAddressInput = {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type OrderConfirmationInput = {
  orderId: number | string;
  customerEmail: string;
  customerName?: string;
  lineItems: LineItemInput[];
  subtotalCents: number;
  totalCents: number;
  shippingAddress: ShippingAddressInput;
};

export type SendOrderConfirmationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "resend_error" };

// Inline HTML escape for any user-provided string that lands in the email
// body. Doesn't need to be airtight (we already trust most of these values
// — they came from Stripe Checkout or our own Order schema) but cheap
// insurance against an admin-edited product name with stray markup.
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderOrderConfirmationHtml(input: OrderConfirmationInput): string {
  const firstName = input.customerName?.split(/\s+/)[0]?.trim();
  const heading = firstName
    ? `Thank you, ${escape(firstName)}.`
    : "Thank you.";

  const lineItemsHtml = input.lineItems
    .map((item) => {
      const lineTotal = formatPriceCents(item.priceCents * item.quantity);
      return `
        <tr>
          <td style="padding: 8px 0; font-size: 16px; color: #2A2420;">
            ${escape(item.name)}
            <span style="color: rgba(42, 36, 32, 0.5);">× ${item.quantity}</span>
          </td>
          <td style="padding: 8px 0; font-size: 16px; color: #2A2420; text-align: right; font-variant-numeric: tabular-nums;">
            ${lineTotal}
          </td>
        </tr>
      `;
    })
    .join("");

  const addressLines: string[] = [
    escape(input.shippingAddress.recipientName),
    escape(input.shippingAddress.line1),
  ];
  if (input.shippingAddress.line2) {
    addressLines.push(escape(input.shippingAddress.line2));
  }
  addressLines.push(
    `${escape(input.shippingAddress.city)}, ${escape(input.shippingAddress.region)} ${escape(input.shippingAddress.postalCode)}`
  );
  if (input.shippingAddress.country && input.shippingAddress.country !== "US") {
    addressLines.push(escape(input.shippingAddress.country));
  }
  const addressHtml = addressLines.join("<br>");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order confirmed</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2A2420;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF7F2;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">
            <tr>
              <td style="padding-bottom: 32px;">
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; color: #2A2420;">nepali threads</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px;">
                <p style="margin: 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: #A88A3D;">Order confirmed</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 16px;">
                <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: normal; color: #2A2420; line-height: 1.2;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 32px;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(42, 36, 32, 0.7);">Your order has been received. We'll send another email when it ships.</p>
              </td>
            </tr>
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid rgba(42, 36, 32, 0.1); border-radius: 8px; background-color: rgba(42, 36, 32, 0.03);">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(42, 36, 32, 0.6);">Order #${escape(String(input.orderId))}</p>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        ${lineItemsHtml}
                      </table>
                      <hr style="border: 0; border-top: 1px solid rgba(42, 36, 32, 0.1); margin: 16px 0;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="font-size: 16px; color: rgba(42, 36, 32, 0.7);">Total</td>
                          <td style="text-align: right; font-size: 16px; font-weight: 500; color: #2A2420; font-variant-numeric: tabular-nums;">${formatPriceCents(input.totalCents)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 32px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(42, 36, 32, 0.6);">Shipping to</p>
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #2A2420;">${addressHtml}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(42, 36, 32, 0.1); margin-top: 32px;">
                <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: rgba(42, 36, 32, 0.6); text-align: center;">Made by hand in Nepal.<br>Replies to this email go straight to the studio.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOrderConfirmation(
  input: OrderConfirmationInput
): Promise<SendOrderConfirmationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "[email] Order confirmation skipped — RESEND_API_KEY or RESEND_FROM_EMAIL not set",
      { orderId: input.orderId }
    );
    return { sent: false, reason: "not_configured" };
  }

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: input.customerEmail,
      subject: "Order confirmed — Nepali Threads",
      html: renderOrderConfirmationHtml(input),
    });

    if (result.error) {
      console.error(
        "[email] Resend returned an error",
        { orderId: input.orderId, error: result.error }
      );
      return { sent: false, reason: "resend_error" };
    }

    console.log("[email] Order confirmation sent", {
      orderId: input.orderId,
      to: input.customerEmail,
      resendId: result.data?.id,
    });
    return { sent: true };
  } catch (err) {
    console.error(
      "[email] Resend threw",
      { orderId: input.orderId },
      err
    );
    return { sent: false, reason: "resend_error" };
  }
}
