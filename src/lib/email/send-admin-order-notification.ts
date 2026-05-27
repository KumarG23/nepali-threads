// LOCAL-LLM: DO NOT EDIT
//
// Sends an internal "new order" notification email to the admins (dad,
// sister, Neal) every time persistStripeOrder creates a new Order.
// Lives alongside the customer-facing sendOrderConfirmation — same
// pattern, same never-throws contract.
//
// Recipients come from the ADMIN_NOTIFICATION_EMAILS env var
// (comma-separated). If unset, the helper logs once and skips. The
// order is already persisted by the time this fires; a missing or
// failed admin email is a small-business operational issue, not a
// customer-facing one.

import { Resend } from "resend";

import { formatPriceCents } from "@/lib/format";

type LineItemInput = {
  name: string;
  sku?: string;
  quantity: number;
  priceCents: number;
};

type ShippingAddressInput = {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type AdminOrderNotificationInput = {
  orderId: number | string;
  customerEmail?: string;
  customerName?: string;
  lineItems: LineItemInput[];
  subtotalCents: number;
  totalCents: number;
  shippingAddress: ShippingAddressInput;
};

export type SendAdminOrderNotificationResult =
  | { sent: true; recipients: number }
  | {
      sent: false;
      reason: "not_configured" | "no_recipients" | "resend_error";
    };

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"));
}

function adminOrderUrl(orderId: number | string): string | null {
  const base = process.env.PAYLOAD_PUBLIC_SERVER_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/admin/collections/orders/${orderId}`;
}

function renderAdminOrderNotificationHtml(
  input: AdminOrderNotificationInput
): string {
  const lineItemsHtml = input.lineItems
    .map((item) => {
      const lineTotal = formatPriceCents(item.priceCents * item.quantity);
      const skuLine = item.sku
        ? `<div style="font-size: 13px; color: rgba(42, 36, 32, 0.55); margin-top: 2px;">SKU: ${escape(item.sku)}</div>`
        : "";
      return `
        <tr>
          <td style="padding: 10px 0; font-size: 15px; color: #2A2420; vertical-align: top;">
            <div>${escape(item.name)} <span style="color: rgba(42, 36, 32, 0.5);">× ${item.quantity}</span></div>
            ${skuLine}
          </td>
          <td style="padding: 10px 0; font-size: 15px; color: #2A2420; text-align: right; font-variant-numeric: tabular-nums; vertical-align: top;">
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
  addressLines.push(escape(input.shippingAddress.country));
  if (input.shippingAddress.phone) {
    addressLines.push(`Phone: ${escape(input.shippingAddress.phone)}`);
  }

  const customerLine = (() => {
    const name = input.customerName ? escape(input.customerName) : null;
    const email = input.customerEmail ? escape(input.customerEmail) : null;
    if (name && email) {
      return `${name} &lt;<a href="mailto:${email}" style="color:#9B2C2C;">${email}</a>&gt;`;
    }
    if (email) {
      return `<a href="mailto:${email}" style="color:#9B2C2C;">${email}</a>`;
    }
    if (name) return name;
    return "Guest checkout";
  })();

  const adminUrl = adminOrderUrl(input.orderId);
  const openInAdminButton = adminUrl
    ? `<p style="margin: 24px 0 0 0;"><a href="${adminUrl}" style="display:inline-block;background-color:#2A2420;color:#FFFFFF;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;padding:10px 18px;border-radius:4px;">Open order in admin →</a></p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New order #${escape(String(input.orderId))}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;color:#2A2420;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid rgba(42,36,32,0.08);border-radius:6px;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9A6B1F;">
                  New order
                </p>
                <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#2A2420;">
                  Order #${escape(String(input.orderId))}
                </h1>
                <p style="margin:8px 0 0 0;font-size:14px;color:rgba(42,36,32,0.7);">
                  ${customerLine}
                </p>
                ${openInAdminButton}
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 8px 32px;">
                <h2 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:rgba(42,36,32,0.55);">
                  Items
                </h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${lineItemsHtml}
                  <tr>
                    <td style="padding:14px 0 6px 0;font-size:14px;color:rgba(42,36,32,0.7);border-top:1px solid rgba(42,36,32,0.08);">
                      Subtotal
                    </td>
                    <td style="padding:14px 0 6px 0;font-size:14px;color:rgba(42,36,32,0.7);text-align:right;font-variant-numeric:tabular-nums;border-top:1px solid rgba(42,36,32,0.08);">
                      ${formatPriceCents(input.subtotalCents)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0 0 0;font-size:16px;font-weight:600;color:#2A2420;">
                      Total
                    </td>
                    <td style="padding:6px 0 0 0;font-size:16px;font-weight:600;color:#2A2420;text-align:right;font-variant-numeric:tabular-nums;">
                      ${formatPriceCents(input.totalCents)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 32px 32px;">
                <h2 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:rgba(42,36,32,0.55);">
                  Ship to
                </h2>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#2A2420;">
                  ${addressLines.join("<br />")}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px;border-top:1px solid rgba(42,36,32,0.08);font-size:12px;color:rgba(42,36,32,0.55);">
                Sent automatically when a new Stripe payment lands.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendAdminOrderNotification(
  input: AdminOrderNotificationInput
): Promise<SendAdminOrderNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "[email] Admin order notification skipped — RESEND_API_KEY or RESEND_FROM_EMAIL not set",
      { orderId: input.orderId }
    );
    return { sent: false, reason: "not_configured" };
  }

  const recipients = parseRecipients(process.env.ADMIN_NOTIFICATION_EMAILS);
  if (recipients.length === 0) {
    console.warn(
      "[email] Admin order notification skipped — ADMIN_NOTIFICATION_EMAILS not set",
      { orderId: input.orderId }
    );
    return { sent: false, reason: "no_recipients" };
  }

  const totalLabel = formatPriceCents(input.totalCents);
  const nameOrEmail =
    input.customerName?.trim() ||
    input.customerEmail?.trim() ||
    "guest";
  const subject = `New order #${input.orderId} — ${totalLabel} — ${nameOrEmail}`;

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html: renderAdminOrderNotificationHtml(input),
    });

    if (result.error) {
      console.error(
        "[email] Resend returned an error on admin notification",
        { orderId: input.orderId, error: result.error }
      );
      return { sent: false, reason: "resend_error" };
    }

    console.log("[email] Admin order notification sent", {
      orderId: input.orderId,
      recipients: recipients.length,
      resendId: result.data?.id,
    });
    return { sent: true, recipients: recipients.length };
  } catch (err) {
    console.error(
      "[email] Resend threw on admin notification",
      { orderId: input.orderId },
      err
    );
    return { sent: false, reason: "resend_error" };
  }
}
