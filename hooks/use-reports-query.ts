"use client";

import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "./use-queries-shared";
import type { ReportData } from "@/lib/types";

export function useReports(year: string) {
    const companyId = useCompanyId();
    return useQuery<ReportData>({
        queryKey: ["reports", year, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams({ year });
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/reports?${params}`);
            if (!res.ok) throw new Error("Failed to fetch reports");
            return res.json();
        },
    });
}
