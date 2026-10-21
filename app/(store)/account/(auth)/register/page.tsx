import type { Metadata } from "next";
import { AuthShell } from "@/components/store/account/auth-shell";
import { RegisterForm } from "@/components/store/account/auth-forms";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <AuthShell title="Create your account" intro="Track every order from our suppliers to your door.">
      <RegisterForm next={callbackUrl} />
    </AuthShell>
  );
}
