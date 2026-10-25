"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AchatDetailSkeleton() {
    return (
        <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-40 rounded-lg" />
                    <Skeleton className="h-56 rounded-lg" />
                </div>
            </div>
        </div>
    );
}
