"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedCheque } from "@/lib/types";

interface ChequesResponse {
    cheques: SerializedCheque[];
    stats: {
        recusCount: number;
        recusMontant: string;
        emisCount: number;
        emisMontant: string;
        enAttenteCount: number;
        enAttenteMontant: string;
        encaissesCount: number;
        encaissesMontant: string;
    };
}

export function useCheques() {
    const companyId = useCompanyId();
    return useQuery<ChequesResponse>({
        queryKey: ["cheques", companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/cheques?${params}`);
            if (!res.ok) throw new Error("Failed to fetch cheques");
            return res.json();
        },
    });
}

export function useCreateCheque() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/cheques?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création chèque");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["cheques"] }),
    });
}
