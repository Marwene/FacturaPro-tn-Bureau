"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { SerializedTiers } from "@/lib/types";

export interface ProductSupplier {
    id: string;
    supplierId: string;
    supplierName: string;
    purchasePrice: number;
    reference: string | null;
    isDefault: boolean;
}

interface ProductSuppliersResponse {
    suppliers: ProductSupplier[];
}

interface SupplierOptionsResponse {
    fournisseurs: SerializedTiers[];
}

interface PriceHistoryEntry {
    id: string;
    purchasePrice: number;
    changedAt: string;
    changedBy: string | null;
    reason: string | null;
}

interface SupplierInfo {
    id: string;
    name: string;
    currentPrice: number;
    reference: string | null;
}

interface PriceHistoryResponse {
    supplier: SupplierInfo;
    history: PriceHistoryEntry[];
}

interface SupplierComparison {
    id: string;
    supplierId: string;
    supplierName: string;
    purchasePrice: number;
    reference: string | null;
    isDefault: boolean;
    priceVsAvg: number;
    priceVsBest: number;
}

interface SupplierStats {
    count: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    priceRange: number;
    bestSupplier: {
        id: string;
        name: string;
        price: number;
    } | null;
}

interface SupplierComparisonResponse {
    suppliers: SupplierComparison[];
    stats: SupplierStats;
}

export function useProductSuppliers(productId: string) {
    return useQuery<ProductSuppliersResponse>({
        queryKey: queryKeys.produits.suppliers(productId),
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/suppliers`);
            if (!res.ok) throw new Error("Erreur lors du chargement des fournisseurs");
            return res.json();
        },
    });
}

export function useSupplierOptions() {
    return useQuery<SupplierOptionsResponse>({
        queryKey: queryKeys.produits.suppliersList(),
        queryFn: async () => {
            const res = await fetch("/api/fournisseurs");
            if (!res.ok) throw new Error("Erreur lors du chargement des fournisseurs");
            return res.json();
        },
    });
}

export function useAddProductSupplier(productId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: { supplierId: string; purchasePrice: number; reference?: string }) => {
            const res = await fetch(`/api/products/${productId}/suppliers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message ?? "Erreur lors de l'ajout");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.produits.suppliers(productId) });
        },
    });
}

export function useDeleteProductSupplier(productId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (supplierId: string) => {
            const res = await fetch(`/api/products/${productId}/suppliers/${supplierId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Erreur lors de la suppression");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.produits.suppliers(productId) });
        },
    });
}

export function useSetDefaultProductSupplier(productId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (supplierId: string) => {
            const res = await fetch(`/api/products/${productId}/suppliers/${supplierId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });
            if (!res.ok) throw new Error("Erreur lors de la mise à jour");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.produits.suppliers(productId) });
        },
    });
}

export function useSupplierPriceHistory(productId: string, supplierId: string) {
    return useQuery<PriceHistoryResponse>({
        queryKey: queryKeys.produits.priceHistory(productId, supplierId),
        queryFn: async () => {
            const res = await fetch(
                `/api/products/${productId}/suppliers/${supplierId}/history`
            );
            if (!res.ok) throw new Error("Erreur lors du chargement de l'historique");
            return res.json();
        },
        enabled: !!productId && !!supplierId,
    });
}

export function useSupplierComparison(productId: string) {
    return useQuery<SupplierComparisonResponse>({
        queryKey: queryKeys.produits.supplierComparison(productId),
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/suppliers/compare`);
            if (!res.ok) throw new Error("Erreur lors du chargement de la comparaison");
            return res.json();
        },
    });
}
