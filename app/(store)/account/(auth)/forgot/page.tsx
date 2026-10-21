import type { Metadata } from "next";
import { AuthShell } from "@/components/store/account/auth-shell";
import { ForgotForm } from "@/components/store/account/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter the email you signed up with and we'll send you a link to choose a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
