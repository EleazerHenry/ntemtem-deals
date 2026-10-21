import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/store/account/auth-shell";
import { ResetForm } from "@/components/store/account/auth-forms";
import { Button } from "@/components/ui/button";
import { readToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const check = readToken(token, "reset-password");
  if (!check.ok || !token) {
    return (
      <AuthShell
        title={check.ok === false && check.reason === "expired" ? "This link has expired" : "This link isn't valid"}
        intro="Reset links work for one hour and only once. Ask for a new one and use the latest email."
      >
        <Button asChild size="xl" className="h-12 w-full">
          <Link href="/account/forgot">Send me a new link</Link>
        </Button>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" intro={`For ${check.email}.`}>
      <ResetForm token={token} />
    </AuthShell>
  );
}
