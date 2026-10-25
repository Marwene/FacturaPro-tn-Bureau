"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TresorerieData } from "@/lib/types/tresorerie";
import type { CompteFiltreTresorerie } from "@/hooks/use-tresorerie";

type EcheancierTresorerie = Pick<TresorerieData, "echeancier">;

/** Échéancier sur 365 jours (`GET /api/tresorerie`) — filtre `compte` identique à `useTresorerie`. */
export function useTresorerieEcheances(compte: CompteFiltreTresorerie = "ALL", companyId?: string | null) {
    return useQuery<EcheancierTresorerie>({
        queryKey: ["tresorerie-full", 365, compte, companyId],
        queryFn: async () => {
            const params = new URLSearchParams({ days: "365" });
            if (compte !== "ALL") params.set("compte", compte);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/tresorerie?${params}`);
            if (!res.ok) throw new Error("Erreur chargement échéances");
            return res.json();
        },
        staleTime: 60000,
        placeholderData: keepPreviousData,
    });
}
