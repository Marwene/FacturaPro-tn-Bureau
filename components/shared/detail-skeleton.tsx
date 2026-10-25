import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Chargement de la fiche"
      className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6", className)}
    >
      <span className="sr-only">Chargement…</span>
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" aria-hidden>
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-7 w-56" />
          </div>
          <div className="flex gap-2" aria-hidden>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex gap-2" aria-hidden>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <div
        className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6"
        aria-hidden
      >
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
