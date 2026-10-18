import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/dal";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Fetched here for the sidebar. Pages still call requireAdmin() themselves,
  // because layouts don't re-run on client-side navigation.
  const admin = await requireAdmin();

  return (
    <div className="flex-1 bg-muted/50 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <AdminSidebar admin={admin} />
      <div className="flex min-w-0 flex-col">
        <AdminTopbar admin={admin} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
