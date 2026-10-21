import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signed, expiring tokens for email links — no table needed.
// Format: base64url(payload).signature

type Purpose = "verify-email" | "reset-password";
type Payload = { p: Purpose; u: string; e: string; x: number; h?: string };

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(`token:${data}`).digest("base64url");

/** A short fingerprint of the password hash: a reset link dies once the password changes. */
export const passwordFingerprint = (passwordHash: string | null) =>
  createHash("sha256").update(passwordHash ?? "none").digest("base64url").slice(0, 16);

export function createToken(purpose: Purpose, user: { id: string; email: string }, ttlMinutes: number, fingerprint?: string) {
  const payload: Payload = { p: purpose, u: user.id, e: user.email, x: Date.now() + ttlMinutes * 60_000, ...(fingerprint && { h: fingerprint }) };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export type TokenCheck = { ok: true; userId: string; email: string; fingerprint?: string } | { ok: false; reason: "invalid" | "expired" };

export function readToken(token: string | undefined, purpose: Purpose): TokenCheck {
  if (!token || token.length > 1000) return { ok: false, reason: "invalid" };
  const [data, sig] = token.split(".");
  if (!data || !sig) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (payload.p !== purpose) return { ok: false, reason: "invalid" };
  if (Date.now() > payload.x) return { ok: false, reason: "expired" };
  return { ok: true, userId: payload.u, email: payload.e, fingerprint: payload.h };
}
