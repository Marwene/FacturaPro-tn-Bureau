"use client";

import { useQuery } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

/**
 * Options partagées `useQuery` / `prefetchQuery` (C3) : le préchargement du
 * dashboard pendant le login (`hooks/use-login.ts`) doit cibler EXACTEMENT la
 * même clé et le même queryFn que `useDashboardData()` pour atterrir dans le
 * même cache TanStack.
 */
export function dashboardQueryOptions(companyId: string | null) {
    return {
        queryKey: ["dashboard", companyId] as const,
        queryFn: async () => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/dashboard?${params}`);
            if (!res.ok) throw new Error("Erreur chargement dashboard");
            return res.json();
        },
    };
}

export function useDashboardData() {
    const companyId = useCompanyId();
    return useQuery({
        ...dashboardQueryOptions(companyId),
        placeholderData: (prev) => prev,
    });
}
