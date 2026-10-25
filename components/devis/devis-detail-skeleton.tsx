"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DevisDetailSkeleton() {
    return (
        <div className="flex-1">
            {/* Header Skeleton */}
            <div className="border-b border-border bg-card/50 sticky top-0 z-10">
                <div className="max-w-[1400px] mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-[1400px] mx-auto">
                    {/* LEFT COLUMN */}
                    <div className="space-y-5">
                        {/* Client Card */}
                        <div className="rounded-lg border border-border bg-card p-5">
                            <Skeleton className="h-4 w-16 mb-3" />
                            <Skeleton className="h-5 w-40 mb-1" />
                            <Skeleton className="h-3 w-28 mb-3" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Skeleton className="h-3 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>

                        {/* Lines Table */}
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="px-5 py-3 border-b border-border">
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-px w-full" />
                            <div className="space-y-2.5">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-px w-full" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                        <Skeleton className="h-36 rounded-xl" />
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-9 rounded-lg" />
                            <Skeleton className="h-9 rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
