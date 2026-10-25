"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { User, UsersStats } from "@/components/settings/utilisateurs/users-store";

interface Company {
    id: string;
    name: string;
}

interface MeResponse {
    user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
}

export interface UsersListResponse {
    users: User[];
    stats: UsersStats;
}

export function useCompaniesList<TCompany extends Company = Company>(enabled?: boolean) {
    return useQuery<{ companies: TCompany[] }>({
        queryKey: queryKeys.companies.all(),
        queryFn: async () => {
            const res = await fetch("/api/companies");
            if (!res.ok) throw new Error("Erreur chargement sociétés");
            return res.json() as Promise<{ companies: TCompany[] }>;
        },
        enabled,
    });
}

/** GET /api/users — liste + statistiques (l'écran Utilisateurs restreint l'appel aux ADMIN). */
export function useUsersList(enabled?: boolean) {
    return useQuery<UsersListResponse>({
        queryKey: queryKeys.users.all(),
        queryFn: async () => {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error("Failed");
            return res.json() as Promise<UsersListResponse>;
        },
        enabled,
    });
}

/** GET /api/users/me — profil de l'utilisateur connecté (clé partagée `["me"]`). */
export function useProfilQuery(enabled: boolean) {
    return useQuery({
        queryKey: queryKeys.companies.me(),
        queryFn: async () => {
            const res = await fetch("/api/users/me");
            if (!res.ok) throw new Error("Failed");
            return res.json() as Promise<MeResponse>;
        },
        enabled,
    });
}
