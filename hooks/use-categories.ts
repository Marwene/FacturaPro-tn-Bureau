"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const categorieKeys = {
    all: ["categories"] as const,
};

interface CategorieNode {
    id: string;
    nom: string;
    parentId: string | null;
    enfants: CategorieNode[];
    _count: { products: number };
}

interface CategoriesResponse {
    categories: CategorieNode[];
}

function flattenTree(categories: CategorieNode[], parentId: string | null = null, depth = 0): { id: string; nom: string; parentId: string | null; depth: number; label: string }[] {
    const result: { id: string; nom: string; parentId: string | null; depth: number; label: string }[] = [];
    for (const cat of categories.filter((c) => c.parentId === parentId)) {
        const prefix = "\u00A0\u00A0".repeat(depth);
        result.push({ id: cat.id, nom: cat.nom, parentId: cat.parentId, depth, label: `${prefix}${cat.nom}` });
        result.push(...flattenTree(cat.enfants, cat.id, depth + 1));
    }
    return result;
}

export function useCategories() {
    return useQuery({
        queryKey: categorieKeys.all,
        queryFn: async () => {
            const res = await fetch("/api/categories");
            if (!res.ok) throw new Error("Erreur chargement catégories");
            return res.json() as Promise<CategoriesResponse>;
        },
    });
}

export function useCategoriesFlat() {
    const { data, ...rest } = useCategories();
    const flat = data ? flattenTree(data.categories) : [];
    return { data: flat, ...rest };
}

export function useCategorieMutations() {
    const qc = useQueryClient();

    const createCategorie = useMutation({
        mutationFn: async (data: { nom: string; parentId?: string | null }) => {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création catégorie");
            }
            return res.json();
        },
        onSettled: () => qc.invalidateQueries({ queryKey: categorieKeys.all }),
    });

    const deleteCategorie = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression catégorie");
            }
        },
        onSettled: () => qc.invalidateQueries({ queryKey: categorieKeys.all }),
    });

    return { createCategorie, deleteCategorie };
}
