"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./use-queries-shared";
import type { SerializedTiers } from "@/lib/types";

interface ClientsResponse {
    clients: (SerializedTiers & { solde: string })[];
    stats: {
        totalClients: number;
        totalSolde: string;
        clientsTVA: number;
        avecRetenue: number;
    };
}

export function useClients(search?: string) {
    return useQuery<ClientsResponse>({
        queryKey: queryKeys.clients(search),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            const res = await fetch(`/api/clients?${params}`);
            if (!res.ok) throw new Error("Failed to fetch clients");
            return res.json();
        },
    });
}

export function useCreateClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création client");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    });
}

export function useUpdateClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
            const res = await fetch(`/api/clients/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur mise à jour client");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    });
}

export function useDeleteClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression client");
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    });
}
