"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedStockMovement } from "@/lib/types";

export function useStockMovements(productId: string) {
    return useQuery({
        queryKey: ["stock-movements", productId] as const,
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/stock-movements`);
            if (!res.ok) throw new Error("Erreur chargement mouvements de stock");
            return res.json() as Promise<{ movements: SerializedStockMovement[] }>;
        },
        enabled: !!productId,
    });
}

export function useCreateStockMovement(productId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (data: { type: string; quantite: number; notes?: string }) => {
            const res = await fetch(`/api/products/${productId}/stock-movements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création mouvement");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["stock-movements", productId] });
            qc.invalidateQueries({ queryKey: ["product", productId] });
        },
    });
}
