import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Fixed-window rate limiting kept in Postgres, so every Vercel instance shares
// the same counters. One atomic statement per check — no read-then-write race.

export type Limit = { limit: number; windowSeconds: number };

/** Budgets per action. Generous for real people, useless for scripts. */
export const LIMITS = {
  loginPerIp: { limit: 30, windowSeconds: 15 * 60 },
  loginPerEmail: { limit: 8, windowSeconds: 15 * 60 },
  resetPerIp: { limit: 6, windowSeconds: 60 * 60 },
  resetPerEmail: { limit: 3, windowSeconds: 60 * 60 },
  registerPerIp: { limit: 6, windowSeconds: 60 * 60 },
  verifyEmailPerUser: { limit: 4, windowSeconds: 60 * 60 },
  passwordChangePerUser: { limit: 6, windowSeconds: 15 * 60 },
  trackPerIp: { limit: 15, windowSeconds: 10 * 60 },
  couponPerIp: { limit: 20, windowSeconds: 10 * 60 },
  orderPerIp: { limit: 10, windowSeconds: 10 * 60 },
  payPerIp: { limit: 20, windowSeconds: 10 * 60 },
  saveAccountPerIp: { limit: 6, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

export type RateResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Counts one attempt against `key` and says whether it's within the limit.
 * If the database can't be reached the attempt is allowed (the action itself
 * will fail anyway) — a limiter must never lock everyone out.
 */
export async function hit(key: string, { limit, windowSeconds }: Limit): Promise<RateResult> {
  try {
    const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    if (Math.random() < 0.01) void prune();
    const retryAfterSeconds = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
    return { ok: row.count <= limit, retryAfterSeconds };
  } catch (error) {
    console.error("rate limit check failed — allowing", error);
    return { ok: true, retryAfterSeconds: 0 };
  }
}

/** True when every check passes. All are counted, so each key sees the attempt. */
export async function hitAll(checks: [string, Limit][]): Promise<RateResult> {
  const results = await Promise.all(checks.map(([key, limit]) => hit(key, limit)));
  const blocked = results.filter((r) => !r.ok);
  return blocked.length ? { ok: false, retryAfterSeconds: Math.max(...blocked.map((r) => r.retryAfterSeconds)) } : { ok: true, retryAfterSeconds: 0 };
}

async function prune() {
  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });
  } catch {}
}

/** The visitor's IP as Vercel reports it (first x-forwarded-for hop). */
export function ipFrom(get: (name: string) => string | null | undefined) {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip")?.trim() || "unknown";
}

/** For server actions and route handlers. */
export async function clientIp() {
  const h = await headers();
  return ipFrom((name) => h.get(name));
}

/** "a few minutes" / "about an hour" — for messages, not exact timers. */
export function waitLabel(seconds: number) {
  if (seconds <= 90) return "a minute";
  if (seconds < 50 * 60) return `${Math.ceil(seconds / 60)} minutes`;
  return "an hour";
}
