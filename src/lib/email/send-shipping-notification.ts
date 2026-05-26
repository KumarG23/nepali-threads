// LOCAL-LLM: DO NOT EDIT
//
// Sends a shipping-notification email via Resend when an admin marks an
// Order as shipped + fills tracking info. Fired from the afterChange hook
// on the Orders collection (src/collections/Orders.ts), only on the
// unshipped → shipped state transition.
//
// The function NEVER throws to the caller. Email failures are logged and
// returned as a structured result — admin Save MUST NOT fail because
// Resend had a hiccup.

import { Resend } from "resend";

type ShippingAddressInput = {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type ShippingNotificationInput = {
  orderId: number | string;
  customerEmail: string;
  customerName?: string;
  trackingNumber: string;
  carrier?: string;
  shippingAddress: ShippingAddressInput;
};

export type SendShippingNotificationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "resend_error" };

// Cheap HTML escape — defensive against admin-edited values that might
// contain stray markup. Same shape as the helper in
// send-order-confirmation.ts.
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Map common US carriers to their public tracking URLs. Returns null for
// unknown carriers or empty input — the email then renders the tracking
// number as plain text instead of a link.
function buildTrackingUrl(
  carrier: string | undefined,
  trackingNumber: string
): string | null {
  if (!carrier || !trackingNumber) return null;
  const normalized = carrier.trim().toLowerCase();
  if (normalized.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized === "ups" || normalized.includes("ups ")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
  }
  return null;
}

function renderShippingHtml(input: ShippingNotificationInput): string {
  const firstName = input.customerName?.split(/\s+/)[0]?.trim();
  const heading = firstName
    ? `Your order is on its way, ${escape(firstName)}.`
    : "Your order is on its way.";

  const trackingUrl = buildTrackingUrl(input.carrier, input.trackingNumber);
  const carrierLabel = input.carrier ? escape(input.carrier) : "Tracking";
  const trackingDisplay = escape(input.trackingNumber);

  // Tracking row: linked when we recognize the carrier, plain text otherwise.
  const trackingHtml = trackingUrl
    ? `
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(42, 36, 32, 0.6);">${carrierLabel}</p>
        <p style="margin: 0;">
          <a href="${trackingUrl}" style="font-size: 16px; color: #7A2323; text-decoration: underline; text-underline-offset: 2px; font-variant-numeric: tabular-nums;">${trackingDisplay}</a>
        </p>
      `
    : `
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(42, 36, 32, 0.6);">${carrierLabel}</p>
        <p style="margin: 0; font-size: 16px; color: #2A2420; font-variant-numeric: tabular-nums;"><strong>${trackingDisplay}</strong></p>
      `;

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
    <title>Your order is on its way</title>
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
                <p style="margin: 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: #A88A3D;">Order shipped</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 16px;">
                <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: normal; color: #2A2420; line-height: 1.2;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 32px;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(42, 36, 32, 0.7);">We just packed it up. Tracking info below — it should land in 3–7 business days.</p>
              </td>
            </tr>
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid rgba(42, 36, 32, 0.1); border-radius: 8px; background-color: rgba(42, 36, 32, 0.03);">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(42, 36, 32, 0.6);">Order #${escape(String(input.orderId))}</p>
                      ${trackingHtml}
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

export async function sendShippingNotification(
  input: ShippingNotificationInput
): Promise<SendShippingNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "[email] Shipping notification skipped — RESEND_API_KEY or RESEND_FROM_EMAIL not set",
      { orderId: input.orderId }
    );
    return { sent: false, reason: "not_configured" };
  }

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: input.customerEmail,
      subject: "Your order is on its way — Nepali Threads",
      html: renderShippingHtml(input),
    });

    if (result.error) {
      console.error(
        "[email] Resend returned an error for shipping notification",
        { orderId: input.orderId, error: result.error }
      );
      return { sent: false, reason: "resend_error" };
    }

    console.log("[email] Shipping notification sent", {
      orderId: input.orderId,
      to: input.customerEmail,
      resendId: result.data?.id,
    });
    return { sent: true };
  } catch (err) {
    console.error(
      "[email] Resend threw for shipping notification",
      { orderId: input.orderId },
      err
    );
    return { sent: false, reason: "resend_error" };
  }
}
