"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import type { SerializedAchat, AchatStatus, AchatType, AchatCategorie } from "@/lib/types";
import { handleApiResponse } from "@/lib/api-error";
import { notify } from "@/lib/notify";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    achats: (search?: string, status?: string, type?: string, companyId?: string | null) =>
        ["achats", search, status, type, companyId] as const,
    achat: (id: string, companyId?: string | null) => ["achats", id, companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

/** @deprecated Use useAchat from ./use-achats-queries instead */
export function useAchatDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.achat(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`);
            return handleApiResponse<{ achat: SerializedAchat }>(res, "chargement achat");
        },
        enabled: !!id,
    });
}

export function useAchatScan() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const { extractAchatFromScan } = await import("@/app/actions/achats");
            return extractAchatFromScan(formData);
        },
        onError: (err) => {
            notify.error({ title: "Extraction du scan impossible", error: err, context: "extraction du document par scan" });
        },
    });
}

/** @deprecated Use useCreateAchat/useUpdateAchatStatus/useDeleteAchat from ./use-achats-queries instead */
export function useAchatMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.achats(undefined, undefined, undefined, companyId);

    const createAchat = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedAchat>(res, "création achat");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ achats: SerializedAchat[]; stats: { total: number; totalTTC: string; validees: number; brouillons: number } }>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticAchat: SerializedAchat = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    tiersId: (data.tiersId as string) ?? "",
                    companyId: companyId,
                    dateFacture: (data.dateFacture as Date) ?? now,
                    dateEcheance: (data.dateEcheance as Date) ?? null,
                    referenceFournisseur: (data.referenceFournisseur as string) ?? null,
                    type: (data.type as AchatType) ?? "FACTURE",
                    baseHT: (data.baseHT as string) ?? "0",
                    totalHT: (data.totalHT as string) ?? "0",
                    totalTVA: (data.totalTVA as string) ?? "0",
                    totalTTC: (data.totalTTC as string) ?? "0",
                    timbreFiscal: (data.timbreFiscal as string) ?? "0",
                    status: (data.status as AchatStatus) ?? "BROUILLON",
                    notes: (data.notes as string) ?? null,
                    categorieAchat: (data.categorieAchat as AchatCategorie) ?? null,
                    blAchatId: (data.blAchatId as string) ?? null,
                    createdAt: now,
                    updatedAt: now,
                };
                qc.setQueryData(listKey, {
                    ...previous,
                    achats: [optimisticAchat, ...previous.achats],
                    stats: {
                        ...previous.stats,
                        total: previous.stats.total + 1,
                        brouillons: previous.stats.brouillons + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.achats() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: AchatStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedAchat>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.achat(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ achat: SerializedAchat }>(
                queryKeys.achat(id, companyId)
            );
            if (previous) {
                qc.setQueryData<{ achat: SerializedAchat }>(
                    queryKeys.achat(id, companyId),
                    { ...previous, achat: { ...previous.achat, status } }
                );
            }
            const listPrevious = qc.getQueryData<{ achats: SerializedAchat[] }>(listKey);
            if (listPrevious) {
                qc.setQueryData<{ achats: SerializedAchat[] }>(listKey, {
                    ...listPrevious,
                    achats: listPrevious.achats.map((a) =>
                        a.id === id ? { ...a, status } as SerializedAchat : a
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.achat(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.achats() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteAchat = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression achat");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ achats: SerializedAchat[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ achats: SerializedAchat[] }>(listKey, {
                    ...previous,
                    achats: previous.achats.filter((a) => a.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.achats() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createAchat, updateStatus, deleteAchat };
}
