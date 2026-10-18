import Link from "next/link";
import { Button } from "@/components/ui/button";

// Placeholder until Phase 2 (storefront) replaces it.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="ghana-stripe h-1" />
      <div className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-8">
        <p className="eyebrow text-brand-700">Fast Deals • Quality Products • To Ghana</p>
        <h1 className="text-5xl font-bold sm:text-7xl">
          Ntemtem <span className="text-brand-500">Deals</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          The store is being built. Foundation is in place.
        </p>
        <div>
          <Button asChild size="xl" variant="secondary">
            <Link href="/styleguide">View the design system</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
