"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedExport } from "@/lib/types";

export function useExports(search?: string, status?: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: ["exports", search, status, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (status && status !== "ALL") params.set("status", status);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/exports?${params}`);
            if (!res.ok) throw new Error("Erreur chargement exports");
            return res.json() as Promise<{
                exports: SerializedExport[];
                stats: {
                    total: number;
                    enCours: number;
                    valide: number;
                    brouillon: number;
                };
            }>;
        },
        placeholderData: (prev) => prev,
    });
}

export function useExport(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: ["exports", id, companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`);
            if (!res.ok) throw new Error("Erreur chargement export");
            return res.json() as Promise<{ export: SerializedExport }>;
        },
        enabled: !!id,
    });
}

export function useCreateExport() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création export");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}

export function useUpdateExport() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification export");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
        },
    });
}

export function useDeleteExport() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression export");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
        },
    });
}
