import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { attachGuestOrders, getCustomer } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { readToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const check = readToken(token, "verify-email");
  const user = check.ok
    ? await prisma.user.findUnique({ where: { id: check.userId }, select: { id: true, email: true, emailVerified: true } })
    : null;
  // The link only counts for the email it was sent to (they may have changed it since)
  const valid = check.ok && user && user.email === check.email;

  let added = 0;
  if (valid && user) {
    if (!user.emailVerified) await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    // Now we know the email is theirs, earlier guest orders can safely join the account
    added = await attachGuestOrders(user.id, user.email);
  }
  const signedIn = !!(await getCustomer());

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {valid ? (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="mt-5 text-3xl font-bold">Email confirmed</h1>
          <p className="mt-2 text-muted-foreground">
            {added > 0
              ? `We found ${added} earlier ${added === 1 ? "order" : "orders"} placed with ${user!.email} and added ${added === 1 ? "it" : "them"} to your account.`
              : `Thanks — ${user!.email} is confirmed.`}
          </p>
          <Button asChild size="xl" className="mt-8">
            <Link href={signedIn ? "/account" : "/account/login"}>{signedIn ? "Go to my orders" : "Sign in to see your orders"}</Link>
          </Button>
        </>
      ) : (
        <>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
            <CircleAlert className="size-9" />
          </span>
          <h1 className="mt-5 text-3xl font-bold">{check.ok === false && check.reason === "expired" ? "This link has expired" : "This link isn't valid"}</h1>
          <p className="mt-2 text-muted-foreground">Sign in and we&apos;ll send you a fresh link from your account page.</p>
          <Button asChild size="xl" className="mt-8">
            <Link href="/account">Go to my account</Link>
          </Button>
        </>
      )}
    </div>
  );
}
