"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TresorerieEvolutionData } from "@/lib/types/tresorerie";

export function useTresorerieEvolution(mois: number, flux: "encaissement" | "paiement", companyId?: string | null) {
    return useQuery<TresorerieEvolutionData>({
        queryKey: ["tresorerie-evolution", mois, flux, companyId],
        queryFn: async () => {
            const params = new URLSearchParams({ mois: String(mois), flux });
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/tresorerie/evolution?${params}`);
            if (!res.ok) throw new Error("Erreur chargement évolution");
            return res.json();
        },
        placeholderData: keepPreviousData,
    });
}
