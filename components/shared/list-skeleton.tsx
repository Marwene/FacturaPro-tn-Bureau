import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function ListSkeleton({ rows = 8, columns = 5, className }: ListSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Chargement de la liste"
      className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6", className)}
    >
      <span className="sr-only">Chargement…</span>
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" aria-hidden />
          <Skeleton className="h-7 w-48" aria-hidden />
        </div>
        <Skeleton className="h-8 w-28" aria-hidden />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
        <Skeleton className="h-8 w-56" aria-hidden />
        <Skeleton className="h-8 w-28" aria-hidden />
        <Skeleton className="h-8 w-28" aria-hidden />
      </div>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-4 border-b pb-2" aria-hidden>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-3", i === 0 ? "flex-[2]" : "flex-1")}
            />
          ))}
        </div>
        <div aria-hidden>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b py-3">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton
                  key={j}
                  className={cn("h-4", j === 0 ? "flex-[2]" : "flex-1")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
