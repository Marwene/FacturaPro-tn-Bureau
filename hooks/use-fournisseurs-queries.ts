"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FournisseursResponse {
    fournisseurs: Record<string, unknown>[];
    stats: { total: number; actifs: number; inactifs: number; avecContact: number };
}

export function useFournisseurs(search?: string) {
    return useQuery<FournisseursResponse>({
        queryKey: ["fournisseurs", search] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            const res = await fetch(`/api/fournisseurs?${params}`);
            if (!res.ok) throw new Error("Failed to fetch fournisseurs");
            return res.json();
        },
    });
}

export function useCreateFournisseur() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const res = await fetch("/api/fournisseurs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création fournisseur");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["fournisseurs"] }),
    });
}

export function useUpdateFournisseur() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
            const res = await fetch(`/api/fournisseurs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur mise à jour fournisseur");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["fournisseurs"] }),
    });
}

export function useDeleteFournisseur() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/fournisseurs/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression fournisseur");
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["fournisseurs"] }),
    });
}
