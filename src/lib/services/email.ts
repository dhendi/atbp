/**
 * Sends transactional email via ZeptoMail's HTTP API. Every caller in the app
 * (password reset, guest checkout confirmations, order status, disputes)
 * goes through this one function, so this is the only place a future
 * provider swap (e.g. to SES) would need to happen.
 */
const FROM_ADDRESS = "noreply@atbph.com";
const FROM_NAME = "ATBP";
// This Zoho account is on the Canada data center (see smtp.zeptomail.ca in
// the dashboard) — the default api.zeptomail.com host 401s even with a
// correct token, since the token only exists in the .ca region's system.
const ZEPTOMAIL_API_URL = "https://api.zeptomail.ca/v1.1/email";

export interface SendEmailResult {
  sent: boolean;
  previewText: string;
}

/** Turns a plain-text body into a minimal HTML version — every call site in
 * this app passes plain text, so this is the one place that needs to know
 * about ZeptoMail's htmlbody/textbody split. */
function toHtml(body: string): string {
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family: sans-serif; font-size: 15px; line-height: 1.6; color: #201b15; white-space: pre-wrap;">${escaped}</div>`;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<SendEmailResult> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  if (!token) {
    console.log(`[mock email — ZEPTOMAIL_TOKEN not set] to=${to} subject="${subject}"\n${body}`);
    return { sent: true, previewText: body };
  }

  try {
    const res = await fetch(ZEPTOMAIL_API_URL, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { address: FROM_ADDRESS, name: FROM_NAME },
        to: [{ email_address: { address: to } }],
        subject,
        textbody: body,
        htmlbody: toHtml(body),
      }),
    });

    if (!res.ok) {
      console.error(`[email] ZeptoMail send failed (${res.status}): ${await res.text()}`);
      return { sent: false, previewText: body };
    }
    return { sent: true, previewText: body };
  } catch (err) {
    console.error("[email] ZeptoMail request failed:", err);
    return { sent: false, previewText: body };
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendEmailResult> {
  return sendEmail(
    to,
    "Reset your ATBP password",
    `Someone requested a password reset for this account. If that was you, use this link within the next hour:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`
  );
}
