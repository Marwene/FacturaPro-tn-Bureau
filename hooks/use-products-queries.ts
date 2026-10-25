"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "./use-queries-shared";
import type { SerializedProduct } from "@/lib/types";

interface ProductsResponse {
    products: SerializedProduct[];
    stats: {
        totalProduits: number;
        valeurStock: string;
        alertesStock: number;
        categories: number;
    };
    categories: string[];
}

export function useProducts(search?: string, categorie?: string) {
    const companyId = useCompanyId();
    return useQuery<ProductsResponse>({
        queryKey: ["products", search, categorie, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (categorie && categorie !== "ALL") params.set("categorie", categorie);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/products?${params}`);
            if (!res.ok) throw new Error("Failed to fetch products");
            return res.json();
        },
    });
}

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création produit");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    });
}
