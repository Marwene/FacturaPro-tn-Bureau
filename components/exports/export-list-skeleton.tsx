"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function ExportListSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  )
}
