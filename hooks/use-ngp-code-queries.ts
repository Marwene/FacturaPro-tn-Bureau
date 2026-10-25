"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedNgpCode } from "@/lib/types";

export function useNgpCodes() {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: ["ngp-codes", companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/ngp-codes?${params}`);
            if (!res.ok) throw new Error("Erreur chargement codes NGP");
            return res.json() as Promise<{ codes: SerializedNgpCode[] }>;
        },
        placeholderData: (prev) => prev ?? { codes: [] },
    });
}

export function useCreateNgpCode() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: { code: string; barcode?: string | null; description?: string | null }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/ngp-codes?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création code NGP");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["ngp-codes"] });
        },
    });
}

export function useUpdateNgpCode() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; code?: string; barcode?: string | null; description?: string | null }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/ngp-codes/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification code NGP");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["ngp-codes"] });
        },
    });
}

export function useDeleteNgpCode() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/ngp-codes/${id}?${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression code NGP");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["ngp-codes"] });
        },
    });
}
