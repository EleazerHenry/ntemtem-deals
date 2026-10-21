import "server-only";

// Transactional email through Resend's HTTP API (no SDK needed).
// Without RESEND_API_KEY nothing is sent; callers show a friendly notice instead.

export const emailConfigured = () => !!process.env.RESEND_API_KEY?.startsWith("re_");

const FROM = () => process.env.EMAIL_FROM || "Ntemtem Deals <onboarding@resend.dev>";

export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  // Test-only escape hatch: print links to the server log instead of sending
  if (process.env.EMAIL_LOG_LINKS === "1") {
    console.log(`[email] to=${message.to} subject="${message.subject}" ${message.text.match(/https?:\/\/\S+/)?.[0] ?? ""}`);
    return { sent: true as const };
  }
  if (!emailConfigured()) return { sent: false as const };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("sendEmail failed", res.status, await res.text().catch(() => ""));
      return { sent: false as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("sendEmail failed", error);
    return { sent: false as const };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple branded layout that renders well in Gmail and on phones. */
function layout(title: string, body: string, button: { label: string; url: string }, footnote: string) {
  return `<!doctype html><html><body style="margin:0;background:#FBF8F4;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="height:5px;background:linear-gradient(90deg,#CE1126 0 33%,#FCD116 33% 66%,#006B3F 66%)"></td></tr>
<tr><td style="padding:32px 32px 8px"><div style="font-size:18px;font-weight:700">Ntemtem <span style="color:#F7941D">Deals</span></div></td></tr>
<tr><td style="padding:8px 32px 0"><h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:24px 32px"><a href="${button.url}" style="display:inline-block;background:#F7941D;color:#1A1A1A;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:12px">${esc(button.label)}</a></td></tr>
<tr><td style="padding:0 32px 32px;font-size:13px;color:#6b6460">${footnote}<br><br>If the button doesn't work, copy this link:<br><span style="word-break:break-all">${esc(button.url)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

export function verifyEmailMessage(name: string, url: string) {
  const first = name.split(/\s+/)[0] || "there";
  return {
    subject: "Confirm your email for Ntemtem Deals",
    html: layout(
      `Confirm your email, ${first}`,
      `<p style="font-size:15px;line-height:1.6;margin:0">Tap the button to confirm this is your email. We'll then add any earlier orders you placed with it to your account, so you can track them all in one place.</p>`,
      { label: "Confirm my email", url },
      "This link works for 3 days. If you didn't create an account, ignore this email.",
    ),
    text: `Hi ${first}, confirm your email for Ntemtem Deals: ${url}\nThe link works for 3 days.`,
  };
}

export function resetPasswordMessage(name: string, url: string) {
  const first = name.split(/\s+/)[0] || "there";
  return {
    subject: "Reset your Ntemtem Deals password",
    html: layout(
      "Choose a new password",
      `<p style="font-size:15px;line-height:1.6;margin:0">Hi ${esc(first)}, someone (hopefully you) asked to reset your password. Tap below to choose a new one.</p>`,
      { label: "Choose a new password", url },
      "This link works for 1 hour and only once. If you didn't ask for this, you can ignore this email — your password stays the same.",
    ),
    text: `Hi ${first}, reset your Ntemtem Deals password: ${url}\nThe link works for 1 hour.`,
  };
}
