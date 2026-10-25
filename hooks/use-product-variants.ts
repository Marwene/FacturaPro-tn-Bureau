"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { queryKeys } from "@/lib/query-keys";
import type { SerializedProductVariant } from "@/lib/types";

export function useProductVariants(productId: string) {
    return useQuery({
        queryKey: queryKeys.produits.variants(productId),
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/variants`);
            if (!res.ok) throw new Error("Erreur chargement déclinaisons");
            return res.json() as Promise<{ variants: SerializedProductVariant[] }>;
        },
        enabled: !!productId,
    });
}

export function useProductVariantsList(productIds: string[]) {
    const results = useQueries({
        queries: productIds.map((id) => ({
            queryKey: queryKeys.produits.variants(id),
            queryFn: async () => {
                const res = await fetch(`/api/products/${id}/variants`);
                if (!res.ok) throw new Error("Erreur chargement déclinaisons");
                return res.json() as Promise<{ variants: SerializedProductVariant[] }>;
            },
        })),
    });

    return useMemo(() => {
        const map = new Map<string, SerializedProductVariant[]>();
        productIds.forEach((id, index) => {
            const result = results[index];
            if (result.data) {
                map.set(id, result.data.variants);
            }
        });
        return map;
    }, [productIds, results]);
}

export function useSyncProductVariants() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, variants }: { productId: string; variants: Partial<SerializedProductVariant>[] }) => {
            const res = await fetch(`/api/products/${productId}/variants`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variants }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur sauvegarde déclinaisons");
            }
            return res.json();
        },
        onSuccess: (_data, { productId }) => {
            qc.invalidateQueries({ queryKey: queryKeys.produits.variants(productId) });
            qc.invalidateQueries({ queryKey: queryKeys.produits.detail(productId) });
            qc.invalidateQueries({ queryKey: queryKeys.produits.all() });
        },
    });
}
