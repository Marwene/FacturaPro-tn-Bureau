"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProduitsStore } from "@/lib/stores/produits-store";
import type { SerializedProduct } from "@/lib/types";
import { handleApiResponse } from "@/lib/api-error";

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

export const queryKeys = {
    products: (search?: string, categorie?: string, stockStatus?: string, prixMin?: string, prixMax?: string, supplier?: string) =>
        ["products", search, categorie, stockStatus, prixMin, prixMax, supplier] as const,
};

export function useProduitsList() {
    const searchQuery = useProduitsStore((s) => s.searchQuery);
    const categorieFilter = useProduitsStore((s) => s.categorieFilter);
    const stockStatusFilter = useProduitsStore((s) => s.stockStatusFilter);
    const prixMinFilter = useProduitsStore((s) => s.prixMinFilter);
    const prixMaxFilter = useProduitsStore((s) => s.prixMaxFilter);
    const supplierFilter = useProduitsStore((s) => s.supplierFilter);
    return useQuery({
        queryKey: queryKeys.products(searchQuery, categorieFilter, stockStatusFilter, prixMinFilter, prixMaxFilter, supplierFilter),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchQuery) params.set("search", searchQuery);
            if (categorieFilter && categorieFilter !== "ALL") params.set("categorie", categorieFilter);
            if (stockStatusFilter && stockStatusFilter !== "ALL") params.set("stockStatus", stockStatusFilter);
            if (prixMinFilter) params.set("prixMin", prixMinFilter);
            if (prixMaxFilter) params.set("prixMax", prixMaxFilter);
            if (supplierFilter && supplierFilter !== "ALL") params.set("supplier", supplierFilter);
            const res = await fetch(`/api/products?${params}`);
            return handleApiResponse<ProductsResponse>(res, "chargement produits");
        },
        placeholderData: (prev) => prev,
    });
}

export function useProduitsMutations() {
    const qc = useQueryClient();
    const listKey = queryKeys.products(undefined, undefined, undefined, undefined, undefined, undefined);

    const createProduct = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const res = await fetch(`/api/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ product: SerializedProduct }>(res, "création produit");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<ProductsResponse>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticProduct = {
                    id: `temp-${Date.now()}`,
                    code: "...",
                    nom: (data.nom as string) ?? "Nouveau produit",
                    description: (data.description as string) ?? null,
                    categorieId: (data.categorieId as string) ?? null,
                    categorieName: (data.categorieName as string) ?? null,
                    marqueId: (data.marqueId as string) ?? null,
                    marqueName: (data.marqueName as string) ?? null,
                    tiersId: (data.tiersId as string) ?? null,
                    tiersName: (data.tiersName as string) ?? null,
                    photoUrl: null,
                    ficheTechniqueUrl: null,
                    codeBarre: (data.codeBarre as string) ?? null,
                    prixHT: (data.prixHT as string) ?? "0",
                    prixAchat: (data.prixAchat as string) ?? "0",
                    prixAchatDefault: null,
                    tauxTVA: (data.tauxTVA as string) ?? "19",
                    fodec: (data.fodec as boolean) ?? false,
                    tauxFodec: (data.tauxFodec as string) ?? "0",
                    stockActuel: "0",
                    stockMinimum: (data.stockMinimum as string) ?? "0",
                    unite: (data.unite as string) ?? "pièce",
                    estSurCommande: (data.estSurCommande as boolean) ?? false,
                    quantiteParUnite: (data.quantiteParUnite as string) ?? null,
                    stockStatus: "OK" as const,
                    actif: true,
                    createdAt: now,
                    updatedAt: now,
                } satisfies SerializedProduct;
                qc.setQueryData<ProductsResponse>(listKey, {
                    ...previous,
                    products: [optimisticProduct, ...previous.products],
                    stats: {
                        ...previous.stats,
                        totalProduits: previous.stats.totalProduits + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: listKey });
        },
    });

    const updateProduct = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
            const res = await fetch(`/api/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ product: SerializedProduct }>(res, "modification produit");
        },
        onMutate: async ({ id, data }) => {
            await qc.cancelQueries({ queryKey: ["products"] });
            const previous = qc.getQueryData<ProductsResponse>(listKey);
            if (previous) {
                qc.setQueryData<ProductsResponse>(listKey, {
                    ...previous,
                    products: previous.products.map((p) =>
                        p.id === id ? { ...p, ...data } as SerializedProduct : p
                    ),
                });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                qc.setQueryData(listKey, context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });

    const deleteProduct = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression produit");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["products"] });
            const previous = qc.getQueryData<ProductsResponse>(listKey);
            if (previous) {
                qc.setQueryData<ProductsResponse>(listKey, {
                    ...previous,
                    products: previous.products.filter((p) => p.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                qc.setQueryData(listKey, context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });

    return { createProduct, updateProduct, deleteProduct };
}

export function useProduitDetail(id: string) {
    return useQuery({
        queryKey: ["product", id] as const,
        queryFn: async () => {
            const res = await fetch(`/api/products/${id}`);
            return handleApiResponse<{ product: SerializedProduct }>(res, "chargement produit");
        },
        enabled: !!id,
    });
}

export function useProduitNextCode(nom: string, enabled: boolean) {
    return useQuery({
        queryKey: ["product-next-code", nom] as const,
        queryFn: async () => {
            const params = nom ? `?nom=${encodeURIComponent(nom)}` : "";
            const res = await fetch(`/api/products/next-code${params}`);
            if (!res.ok) throw new Error("Erreur");
            return handleApiResponse<{ code: string }>(res, "génération du code produit");
        },
        enabled,
        // Conserve le dernier code pendant un re-fetch / un changement de clé
        // (ex-effet : `form.setValue` n'était appelé qu'à l'arrivée d'une NOUVELLE
        // réponse, le champ gardait donc sa valeur entre-temps).
        placeholderData: (prev) => prev,
    });
}

export function useProduitFichiersMutations() {
    const uploadPhoto = useMutation({
        mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
            const fd = new FormData();
            fd.append("photo", file);
            const res = await fetch(`/api/products/${productId}/photo`, { method: "POST", body: fd });
            // Message conservé à l'identique : il est affiché dans un toast par l'appelant.
            if (!res.ok) throw new Error("Erreur upload photo");
            return handleApiResponse<{ photoUrl: string }>(res, "upload de la photo");
        },
    });

    const uploadFiche = useMutation({
        mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
            const fd = new FormData();
            fd.append("fiche", file);
            fd.append("nom", file.name.replace(/\.pdf$/i, "") || "Fiche technique");
            const res = await fetch(`/api/products/${productId}/fiches`, { method: "POST", body: fd });
            // Message conservé à l'identique : il est affiché dans un toast par l'appelant.
            if (!res.ok) throw new Error("Erreur upload fiche");
            return handleApiResponse<{ fiche: { id: string; url: string } }>(res, "upload de la fiche technique");
        },
    });

    const deletePhoto = useMutation({
        mutationFn: async (productId: string) => {
            const res = await fetch(`/api/products/${productId}/photo`, { method: "DELETE" });
            // L'ancien code ne vérifiait pas `res.ok` : l'appelant masquait la photo même en
            // cas d'échec API. On renvoie donc `null` sans throw pour garder ce comportement.
            if (!res.ok) return null;
            return handleApiResponse<{ success: boolean }>(res, "suppression de la photo");
        },
    });

    return { uploadPhoto, uploadFiche, deletePhoto };
}

