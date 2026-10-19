import { Skeleton } from "@/components/ui/skeleton";

export function CatalogueSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-10" aria-busy aria-label="Loading products">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mb-10 h-11 w-64" />
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
