// LOCAL-LLM: DO NOT EDIT
//
// Sends the storefront customer email-verification link. This is intentionally
// separate from Payload's built-in verify email adapter because this project
// already sends transactional mail directly through Resend.

import { Resend } from "resend";

type SendCustomerVerificationInput = {
  customerId: number | string;
  customerEmail: string;
  customerName?: string | null;
  token: string;
};

export type SendCustomerVerificationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "resend_error" };

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nepali-threads.com").replace(
    /\/$/,
    ""
  );
}

function verificationUrl(token: string): string {
  return `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

function renderVerificationHtml(input: SendCustomerVerificationInput): string {
  const firstName = input.customerName?.split(/\s+/)[0]?.trim();
  const greeting = firstName ? `Hi ${escape(firstName)},` : "Hi,";
  const url = verificationUrl(input.token);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F1E8;font-family:Arial, sans-serif;color:#2A2420;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffaf2;border:1px solid rgba(42,36,32,0.12);border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9B6A24;">Nepali Threads</p>
                <h1 style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:32px;line-height:1.2;color:#2A2420;">Verify your email</h1>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;">Please confirm this email address so your Nepali Threads account can safely claim matching guest orders.</p>
                <p style="margin:0 0 28px 0;">
                  <a href="${escape(url)}" style="display:inline-block;background:#A33A2A;color:#FFF7ED;text-decoration:none;border-radius:6px;padding:14px 20px;font-weight:700;">Verify email</a>
                </p>
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:rgba(42,36,32,.65);">If the button does not work, copy and paste this link:</p>
                <p style="margin:0;font-size:14px;line-height:1.6;word-break:break-all;color:rgba(42,36,32,.75);">${escape(url)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendCustomerVerification(
  input: SendCustomerVerificationInput
): Promise<SendCustomerVerificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(
      "[email] Customer verification skipped — RESEND_API_KEY or RESEND_FROM_EMAIL not set",
      { customerId: input.customerId }
    );
    return { sent: false, reason: "not_configured" };
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: input.customerEmail,
      subject: "Verify your Nepali Threads email",
      html: renderVerificationHtml(input),
    });

    if (result.error) {
      console.error("[email] Resend returned an error", {
        customerId: input.customerId,
        error: result.error,
      });
      return { sent: false, reason: "resend_error" };
    }

    console.log("[email] Customer verification sent", {
      customerId: input.customerId,
      to: input.customerEmail,
      resendId: result.data?.id,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Resend threw", { customerId: input.customerId }, err);
    return { sent: false, reason: "resend_error" };
  }
}
