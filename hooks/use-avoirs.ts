"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useAvoirsStore } from "@/lib/stores/avoirs-store";
import type { SerializedAvoir, AvoirStatus, AvoirType } from "@/lib/types";
import { useDeferredValue } from "react";
import { handleApiResponse } from "@/lib/api-error";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    avoirs: (search?: string, status?: string, companyId?: string | null) =>
        ["avoirs", search, status, companyId] as const,
    avoir: (id: string, companyId?: string | null) => ["avoirs", id, companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

interface AvoirsResponse {
    avoirs: SerializedAvoir[];
    stats: {
        total: string;
        count: number;
        emis: number;
        rembourse: number;
        brouillon: number;
    };
}

export function useAvoirsList() {
    const searchInput = useAvoirsStore((s) => s.searchInput);
    const statusFilter = useAvoirsStore((s) => s.statusFilter);
    const companyId = useCompanyId();
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery<AvoirsResponse>({
        queryKey: queryKeys.avoirs(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/avoirs?${params}`);
            return handleApiResponse<AvoirsResponse>(res, "chargement avoirs");
        },
        placeholderData: (prev) => prev,
    });
}

export function useAvoirDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.avoir(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/avoirs/${id}?${params}`);
            return handleApiResponse<{ avoir: SerializedAvoir }>(res, "chargement avoir");
        },
        enabled: !!id,
    });
}

export function useAvoirMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.avoirs(undefined, undefined, companyId);

    const createAvoir = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/avoirs?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedAvoir>(res, "création avoir");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<AvoirsResponse>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticAvoir = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    type: (data.type as AvoirType) ?? "SIMPLE",
                    invoiceId: (data.invoiceId as string) ?? null,
                    tiersId: (data.tiersId as string) ?? null,
                    companyId: companyId ?? null,
                    dateEmission: (data.dateEmission as Date) ?? now,
                    motif: (data.motif as string) ?? null,
                    baseHT: (data.baseHT as string) ?? "0",
                    totalHT: (data.totalHT as string) ?? "0",
                    totalTVA: (data.totalTVA as string) ?? "0",
                    totalFodec: (data.totalFodec as string) ?? "0",
                    totalTTC: (data.totalTTC as string) ?? "0",
                    status: "BROUILLON" as const,
                    notes: (data.notes as string) ?? null,
                    createdAt: now,
                    updatedAt: now,
                } satisfies SerializedAvoir;
                qc.setQueryData<AvoirsResponse>(listKey, {
                    ...previous,
                    avoirs: [optimisticAvoir, ...previous.avoirs],
                    stats: {
                        ...previous.stats,
                        count: previous.stats.count + 1,
                        brouillon: previous.stats.brouillon + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.avoirs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: AvoirStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/avoirs/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedAvoir>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.avoir(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ avoir: SerializedAvoir }>(
                queryKeys.avoir(id, companyId)
            );
            if (previous) {
                qc.setQueryData<{ avoir: SerializedAvoir }>(
                    queryKeys.avoir(id, companyId),
                    { ...previous, avoir: { ...previous.avoir, status } }
                );
            }
            const listPrevious = qc.getQueryData<AvoirsResponse>(listKey);
            if (listPrevious) {
                qc.setQueryData<AvoirsResponse>(listKey, {
                    ...listPrevious,
                    avoirs: listPrevious.avoirs.map((a) =>
                        a.id === id ? { ...a, status } as SerializedAvoir : a
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.avoir(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.avoirs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteAvoir = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/avoirs/${id}?${params}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression avoir");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<AvoirsResponse>(listKey);
            if (previous) {
                qc.setQueryData<AvoirsResponse>(listKey, {
                    ...previous,
                    avoirs: previous.avoirs.filter((a) => a.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.avoirs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createAvoir, updateStatus, deleteAvoir };
}
