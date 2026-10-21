import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountAreaLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-8 sm:pt-12">{children}</div>;
}
