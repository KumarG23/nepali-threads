// LOCAL-LLM: DO NOT EDIT
import type { EmailAdapter, SendEmailOptions } from "payload";
import { Resend } from "resend";

// Bridges Payload's built-in email API (used by forgot-password,
// verify-email, etc.) onto Resend. Customer-facing transactional
// emails (order confirmation, shipping notification) call Resend
// directly from their own modules — both paths share the same
// Resend account + RESEND_FROM_EMAIL.
//
// Wired in payload.config.ts via `email: resendPayloadAdapter`.
export const resendPayloadAdapter: EmailAdapter = ({ payload }) => {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "hello@nepali-threads.com";
  const fromName = "Nepali Threads";

  return {
    name: "resend",
    defaultFromName: fromName,
    defaultFromAddress: fromAddress,
    sendEmail: async (message: SendEmailOptions) => {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        payload.logger.warn(
          { to: message.to, subject: message.subject },
          "[payload-email] RESEND_API_KEY not set; skipping send"
        );
        return null;
      }

      const resend = new Resend(apiKey);
      const rawTo: unknown = message.to;
      const toAddresses: string[] = Array.isArray(rawTo)
        ? rawTo.filter((v: unknown): v is string => typeof v === "string")
        : typeof rawTo === "string"
          ? [rawTo]
          : [];

      if (toAddresses.length === 0) {
        payload.logger.warn(
          { subject: message.subject },
          "[payload-email] No valid recipient; skipping send"
        );
        return null;
      }

      const from =
        (typeof message.from === "string" && message.from) ||
        `${fromName} <${fromAddress}>`;

      try {
        const result = await resend.emails.send({
          from,
          to: toAddresses,
          subject: message.subject ?? "",
          html: message.html ? String(message.html) : "",
          text:
            typeof message.text === "string" ? message.text : undefined,
        });

        if (result.error) {
          payload.logger.error(
            { error: result.error, to: toAddresses, subject: message.subject },
            "[payload-email] Resend returned an error"
          );
          return null;
        }

        return result;
      } catch (err) {
        payload.logger.error(
          { err, to: toAddresses, subject: message.subject },
          "[payload-email] Resend send threw"
        );
        return null;
      }
    },
  };
};
