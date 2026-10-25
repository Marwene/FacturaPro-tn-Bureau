"use client";
import { useQuery } from "@tanstack/react-query";

export interface ProductStatsResponse {
    stats: {
        totalVentes: number;
        totalRevenu: string;
        totalAchats: number;
        totalCout: string;
        stockActuel: string;
        stockMinimum: string;
        marge: string;
    };
    ventesMensuelles: {
        mois: string;
        ventes: number;
        revenu: number;
        achats: number;
        cout: number;
    }[];
}

export function useProductStats(productId: string) {
    return useQuery<ProductStatsResponse>({
        queryKey: ["product", "stats", productId],
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/stats`);
            if (!res.ok) throw new Error("Erreur chargement stats");
            return res.json();
        },
        enabled: !!productId,
    });
}
