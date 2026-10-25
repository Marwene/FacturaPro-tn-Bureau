"use client";

import { useQuery } from "@tanstack/react-query";
import { useCompanyId, companyParam, queryKeys } from "./use-queries-shared";
import type { DashboardStats, ChartDataPoint, TopClient, SerializedInvoice } from "@/lib/types";

interface DashboardResponse {
    stats: DashboardStats;
    recentInvoices: SerializedInvoice[];
    topClients: TopClient[];
    monthlyData: ChartDataPoint[];
}

export function useDashboard() {
    const companyId = useCompanyId();
    return useQuery<DashboardResponse>({
        queryKey: queryKeys.dashboard(companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/dashboard?${params}`);
            if (!res.ok) throw new Error("Failed to fetch dashboard");
            return res.json();
        },
    });
}
