"use client";

import { AdminError } from "@/components/admin/admin-error";

// Catches failures in the admin shell itself (e.g. the admin check can't reach the database).
export default function AdminShellError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/50 px-4 py-16">
      <AdminError {...props} />
    </main>
  );
}
