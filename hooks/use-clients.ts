"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedTiers, TiersSoldeResponse, TiersBlocageInfo, TiersDocumentsResponse } from "@/lib/types";
import { useRef, useCallback } from "react";
import { handleApiResponse } from "@/lib/api-error";

export const queryKeys = {
    clients: () => ["clients"] as const,
    client: (id: string) => ["clients", id] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

export function useClientsList() {
    return useQuery({
        queryKey: queryKeys.clients(),
        queryFn: async () => {
            const res = await fetch(`/api/clients`);
            return handleApiResponse<{
                clients: SerializedTiers[];
                stats: { totalClients: number; totalSolde: string; clientsTVA: number; avecRetenue: number };
            }>(res, "chargement clients");
        },
        placeholderData: (prev) => prev,
    });
}

export function useClientMutations() {
    const qc = useQueryClient();
    const listKey = queryKeys.clients();

    const createClient = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const res = await fetch(`/api/clients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedTiers>(res, "création client");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ clients: SerializedTiers[]; stats: { totalClients: number; totalSolde: string; clientsTVA: number; avecRetenue: number } }>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticClient = {
                    id: `temp-${Date.now()}`,
                    code: "...",
                    raisonSociale: (data.raisonSociale as string) ?? null,
                    adresse: (data.adresse as string) ?? null,
                    ville: (data.ville as string) ?? null,
                    codePostal: (data.codePostal as string) ?? null,
                    telephone: (data.telephone as string) ?? null,
                    email: (data.email as string) ?? null,
                    matriculeFiscal: (data.matriculeFiscal as string) ?? null,
                    registreCommerce: (data.matriculeFiscal as string) ?? null,
                    tva: (data.tva as boolean) ?? false,
                    retenueSource: (data.retenueSource as boolean) ?? false,
                    creditLimit: null,
                    soldeInitial: "0",
                    notes: null,
                    createdAt: now,
                    updatedAt: now,
                } as unknown as SerializedTiers;
                qc.setQueryData(listKey, {
                    ...previous,
                    clients: [optimisticClient, ...previous.clients],
                    stats: {
                        ...previous.stats,
                        totalClients: previous.stats.totalClients + 1,
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

    const updateClient = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<SerializedTiers> }) => {
            const res = await fetch(`/api/clients/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedTiers>(res, "modification client");
        },
        onMutate: async ({ id, data }) => {
            await qc.cancelQueries({ queryKey: listKey });
            await qc.cancelQueries({ queryKey: queryKeys.client(id) });
            const previous = qc.getQueryData<{ clients: SerializedTiers[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ clients: SerializedTiers[] }>(listKey, {
                    ...previous,
                    clients: previous.clients.map((c) =>
                        c.id === id ? { ...c, ...data } as SerializedTiers : c
                    ),
                });
            }
            const detailPrevious = qc.getQueryData<{ client: SerializedTiers }>(
                queryKeys.client(id)
            );
            if (detailPrevious) {
                qc.setQueryData<{ client: SerializedTiers }>(
                    queryKeys.client(id),
                    { ...detailPrevious, client: { ...detailPrevious.client, ...data } as SerializedTiers }
                );
            }
            return { listPrevious: previous, detailPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.listPrevious) qc.setQueryData(listKey, context.listPrevious);
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.client(id), context.detailPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: listKey });
        },
    });

    const deleteClient = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/clients/${id}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression client");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ clients: SerializedTiers[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ clients: SerializedTiers[] }>(listKey, {
                    ...previous,
                    clients: previous.clients.filter((c) => c.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: listKey });
        },
    });

    return { createClient, updateClient, deleteClient };
}

export function useSearchLoader() {
    const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerLoading = useCallback(
        (setSearchLoading: (v: boolean) => void) => {
            setSearchLoading(true);
            if (ref.current) clearTimeout(ref.current);
            ref.current = setTimeout(() => setSearchLoading(false), 200);
        },
        []
    );

    return { triggerLoading };
}

// ─── Client Detail ───────────────────────────────────────────────────────────

export const clientDetailKeys = {
    detail: (id: string) => ["client-detail", id] as const,
    solde: (id: string, from?: string, to?: string) => ["client-solde", id, from, to] as const,
    documents: (id: string) => ["client-documents", id] as const,
};

export function useClientDetail(id: string) {
    return useQuery({
        queryKey: clientDetailKeys.detail(id),
        queryFn: async () => {
            const res = await fetch(`/api/clients/${id}/detail`);
            return handleApiResponse<{
                client: SerializedTiers;
                stats: {
                    totalCA: string;
                    totalPaye: string;
                    totalImpaye: string;
                    totalAvoirs: string;
                    nbFactures: number;
                    nbFacturesImpayees: number;
                    nbDevis: number;
                    nbBC: number;
                    nbBL: number;
                    nbAvoirs: number;
                };
                blocage: TiersBlocageInfo;
            }>(res, "chargement détail client");
        },
        enabled: !!id,
    });
}

export function useClientSolde(id: string, from?: string, to?: string) {
    return useQuery({
        queryKey: clientDetailKeys.solde(id, from, to),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const qs = params.toString();
            const res = await fetch(`/api/clients/${id}/solde${qs ? `?${qs}` : ""}`);
            return handleApiResponse<TiersSoldeResponse>(res, "chargement solde");
        },
        enabled: !!id,
    });
}

export function useClientDocuments(id: string) {
    return useQuery({
        queryKey: clientDetailKeys.documents(id),
        queryFn: async () => {
            const res = await fetch(`/api/clients/${id}/documents`);
            return handleApiResponse<TiersDocumentsResponse>(res, "chargement documents");
        },
        enabled: !!id,
    });
}

export function useClientBlocageMutations(id: string) {
    const qc = useQueryClient();

    const updateCreditLimit = useMutation({
        mutationFn: async (creditLimit: number) => {
            const res = await fetch(`/api/clients/${id}/credit-limit`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creditLimit }),
            });
            return handleApiResponse<TiersBlocageInfo>(res, "mise à jour limite");
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: clientDetailKeys.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.client(id) });
        },
    });

    const checkBlocage = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/clients/${id}/check-blocage`, { method: "POST" });
            return handleApiResponse<TiersBlocageInfo & { message: string }>(res, "vérification blocage");
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: clientDetailKeys.detail(id) });
        },
    });

    const envoyerRappel = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/clients/${id}/envoyer-rappel`, { method: "POST" });
            return handleApiResponse<{ success: boolean; message: string }>(res, "envoi rappel");
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: clientDetailKeys.detail(id) });
        },
    });

    return { updateCreditLimit, checkBlocage, envoyerRappel };
}
