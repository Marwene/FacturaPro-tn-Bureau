"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const marqueKeys = {
    all: ["marques"] as const,
};

interface Marque {
    id: string;
    nom: string;
    _count: { products: number };
}

interface MarquesResponse {
    marques: Marque[];
}

export function useMarques() {
    return useQuery({
        queryKey: marqueKeys.all,
        queryFn: async () => {
            const res = await fetch("/api/marques");
            if (!res.ok) throw new Error("Erreur chargement marques");
            return res.json() as Promise<MarquesResponse>;
        },
    });
}

export function useMarqueMutations() {
    const qc = useQueryClient();

    const createMarque = useMutation({
        mutationFn: async (data: { nom: string }) => {
            const res = await fetch("/api/marques", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création marque");
            }
            return res.json();
        },
        onSettled: () => qc.invalidateQueries({ queryKey: marqueKeys.all }),
    });

    const deleteMarque = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/marques/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression marque");
            }
        },
        onSettled: () => qc.invalidateQueries({ queryKey: marqueKeys.all }),
    });

    return { createMarque, deleteMarque };
}
