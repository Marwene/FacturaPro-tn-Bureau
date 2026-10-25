"use client";
import { useQuery } from "@tanstack/react-query";

interface CompanyItem {
    id: string;
    name: string;
    type: string;
    devise: string;
    logo: string | null;
}

/**
 * Options partagées `useQuery` / `prefetchQuery` (C3) : le préchargement des
 * sociétés de l'utilisateur pendant le login (`hooks/use-login.ts`) doit
 * cibler EXACTEMENT la même clé que `useUserCompanies()` (consommé par
 * `company-switcher` et `useActiveCompanyId`) pour atterrir dans le même cache.
 */
export function userCompaniesQueryOptions(userId?: string) {
    return {
        queryKey: ["user-companies", userId] as const,
        queryFn: async () => {
            const res = await fetch("/api/user/companies");
            if (!res.ok) throw new Error("Failed");
            return res.json() as Promise<{
                companies: CompanyItem[];
                primaryCompanyId: string | null;
            }>;
        },
    };
}

export function useUserCompanies(userId?: string) {
    return useQuery({
        ...userCompaniesQueryOptions(userId),
        enabled: !!userId,
    });
}
