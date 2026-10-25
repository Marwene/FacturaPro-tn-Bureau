"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { SerializedProduct } from "@/lib/types";

export function useProductsForLabels(enabled = true) {
    return useQuery({
        queryKey: queryKeys.produits.listForLabels(),
        queryFn: async () => {
            const res = await fetch("/api/products?limit=500");
            if (!res.ok) throw new Error("Erreur chargement produits");
            return res.json() as Promise<{ products: SerializedProduct[] }>;
        },
        enabled,
    });
}
