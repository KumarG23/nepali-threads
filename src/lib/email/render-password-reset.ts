// LOCAL-LLM: DO NOT EDIT

interface RenderArgs {
  resetUrl: string;
  customerName?: string | null;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPasswordResetHtml({
  resetUrl,
  customerName,
}: RenderArgs): string {
  const safeUrl = escape(resetUrl);
  const greeting =
    customerName && customerName.trim()
      ? `Hi ${escape(customerName.trim())},`
      : "Hi there,";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your Nepali Threads password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#FAF7F2;font-family:Georgia,'Times New Roman',serif;color:#2A2420;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid rgba(42,36,32,0.08);border-radius:6px;">
            <tr>
              <td style="padding:40px 40px 24px 40px;">
                <p style="margin:0 0 12px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9A6B1F;">
                  Password reset
                </p>
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#2A2420;line-height:1.25;">
                  nepali threads
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;color:#2A2420;">
                <p style="margin:0 0 16px 0;">${greeting}</p>
                <p style="margin:0 0 16px 0;">
                  Someone &mdash; probably you &mdash; asked to reset the password on your Nepali Threads account.
                  Click below to set a new one. The link expires in an hour.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 32px 40px;">
                <a href="${safeUrl}"
                   style="display:inline-block;background-color:#9B2C2C;color:#FFFFFF;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 28px;border-radius:4px;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.6;color:rgba(42,36,32,0.7);">
                <p style="margin:0 0 8px 0;">
                  If the button doesn't work, paste this link into your browser:
                </p>
                <p style="margin:0 0 16px 0;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#9B2C2C;">${safeUrl}</a>
                </p>
                <p style="margin:0;">
                  Didn't ask for this? You can safely ignore this email &mdash; your password won't change unless you click the link.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-top:1px solid rgba(42,36,32,0.08);font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(42,36,32,0.55);">
                Nepali Threads &middot; handmade in Nepal
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
