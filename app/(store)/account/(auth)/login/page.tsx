import type { Metadata } from "next";
import { AuthShell } from "@/components/store/account/auth-shell";
import { LoginForm } from "@/components/store/account/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; reset?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <AuthShell title="Welcome back" intro="Sign in to track your orders and check out faster.">
      <LoginForm next={callbackUrl} />
    </AuthShell>
  );
}
