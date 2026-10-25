"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useBonsCommandeStore } from "@/lib/stores/bons-commande-store";
import type { SerializedBonCommande, BonCommandeStatus } from "@/lib/types";
import type { BonCommandeInput } from "@/lib/schemas/bon-commande";
import { useDeferredValue } from "react";
import { handleApiResponse } from "@/lib/api-error";
import { notify } from "@/lib/notify";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    bcs: (search?: string, status?: string, companyId?: string | null) =>
        ["bons-commande", search, status, companyId] as const,
    bc: (id: string, companyId?: string | null) => ["bons-commande", id, companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

export function useBCList() {
    const searchInput = useBonsCommandeStore((s) => s.searchInput);
    const statusFilter = useBonsCommandeStore((s) => s.statusFilter);
    const companyId = useCompanyId();
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery({
        queryKey: queryKeys.bcs(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/bons-commande?${params}`);
            return handleApiResponse<{
                data: SerializedBonCommande[];
                stats: { total: number; countAccepted: number; countDraft: number };
            }>(res, "chargement bons de commande");
        },
        placeholderData: (prev) => prev,
    });
}

export function useBCDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.bc(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-commande/${id}?${params}`);
            return handleApiResponse<{ data: SerializedBonCommande }>(res, "chargement bon de commande");
        },
        enabled: !!id,
    });
}

export function useBCMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.bcs(undefined, undefined, companyId);

    const createBC = useMutation({
        mutationFn: async (data: BonCommandeInput) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-commande?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedBonCommande>(res, "création bon de commande");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ data: SerializedBonCommande[]; stats: { total: number; countAccepted: number; countDraft: number } }>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticBC: SerializedBonCommande = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    tiersId: data.tiersId ?? "",
                    companyId: companyId ?? null,
                    dateCreation: new Date(data.dateCreation),
                    dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : null,
                    baseHT: "0",
                    totalHT: (data.totalHT ?? 0).toString(),
                    totalTVA: (data.totalTVA ?? 0).toString(),
                    totalFodec: "0",
                    totalTTC: (data.totalTTC ?? 0).toString(),
                    status: "BROUILLON" as BonCommandeStatus,
                    notes: data.notes ?? null,
                    referenceClient: data.referenceClient ?? null,
                    createdAt: now,
                    updatedAt: now,
                };
                qc.setQueryData(listKey, {
                    ...previous,
                    data: [optimisticBC, ...previous.data],
                    stats: {
                        ...previous.stats,
                        total: previous.stats.total + 1,
                        countDraft: previous.stats.countDraft + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bcs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: BonCommandeStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-commande/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedBonCommande>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.bc(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ data: SerializedBonCommande }>(
                queryKeys.bc(id, companyId)
            );
            if (previous) {
                qc.setQueryData<{ data: SerializedBonCommande }>(
                    queryKeys.bc(id, companyId),
                    { ...previous, data: { ...previous.data, status } }
                );
            }
            const listPrevious = qc.getQueryData<{ data: SerializedBonCommande[] }>(listKey);
            if (listPrevious) {
                qc.setQueryData<{ data: SerializedBonCommande[] }>(listKey, {
                    ...listPrevious,
                    data: listPrevious.data.map((b) =>
                        b.id === id ? { ...b, status } as SerializedBonCommande : b
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.bc(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bcs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteBC = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-commande/${id}?${params}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression bon de commande");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ data: SerializedBonCommande[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ data: SerializedBonCommande[] }>(listKey, {
                    ...previous,
                    data: previous.data.filter((b) => b.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bcs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createBC, updateStatus, deleteBC };
}

export function useBonCommandeScan() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    const extractBC = useMutation({
        mutationFn: async (formData: FormData) => {
            const { extractBonCommandeFromScan } = await import("@/app/actions/bons-commande");
            return extractBonCommandeFromScan(formData);
        },
        onError: (err) => {
            notify.error({ title: "Extraction du scan impossible", error: err, context: "extraction du bon de commande par scan" });
        },
    });

    const createBC = useMutation({
        mutationFn: async (data: BonCommandeInput) => {
            const { createBonCommandeFromExtraction } = await import("@/app/actions/bons-commande");
            return createBonCommandeFromExtraction(data);
        },
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: queryKeys.bcs(undefined, undefined, companyId) });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bcs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
        onError: (err) => {
            notify.error({ title: "Bon de commande non créé", error: err, context: "création du bon de commande depuis le scan" });
        },
    });

    return { extractBC, createBC };
}

export function useBCValidation() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    return useMutation({
        mutationFn: async (input: { bonCommandeId: string; companyId: string | null; target: "BL" | "FACTURE" }) => {
            const { validateBonCommande } = await import("@/app/actions/bons-commande");
            return validateBonCommande(input);
        },
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: queryKeys.bcs() });
            await qc.cancelQueries({ queryKey: ["delivery-notes"] });
            await qc.cancelQueries({ queryKey: ["invoices"] });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bcs() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
            qc.invalidateQueries({ queryKey: ["delivery-notes"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
        },
        onError: (err) => {
            notify.error({ title: "Validation impossible", error: err, context: "validation du bon de commande" });
        },
    });
}
