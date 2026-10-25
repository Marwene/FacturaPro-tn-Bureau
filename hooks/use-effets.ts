"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffetsStore } from "@/lib/stores/effets-store";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useActiveCompanyId } from "@/hooks/use-active-company";
import { queryKeys as rootQueryKeys } from "@/lib/query-keys";
import { useDeferredValue } from "react";
import { notify } from "@/lib/notify";
import type { SerializedEffet, EffetStatus, EffetType } from "@/lib/types";
import { handleApiResponse } from "@/lib/api-error";
import { useCompanyBankAccounts as useBankAccountsOfCompany } from "@/hooks/use-company-bank-accounts";

interface EffetsStats {
    totalMontant: string;
    enPortefeuille: number;
    remisEscompte: number;
    endosse: number;
    impaye: number;
    paye: number;
    total: number;
}

interface EffetsResponse {
    effets: SerializedEffet[];
    stats: EffetsStats;
}

interface EffetDetailResponse {
    effet: SerializedEffet;
    payEligibility?: {
        canPay: boolean;
        hoursElapsed: number;
        hoursRequired: number;
        hoursRemaining: number;
        payableAt: Date;
    };
}

function useCompanyId() {
    return useActiveCompanyId();
}

export const queryKeys = {
    effets: (search?: string, status?: string, companyId?: string | null, type?: string) =>
        ["effets", search, status, companyId, type] as const,
    effet: (id: string, companyId?: string | null) => ["effet", id, companyId] as const,
};

export function useEffetsList() {
    const companyId = useCompanyId();
    const searchInput = useEffetsStore((s) => s.searchInput);
    const statusFilter = useEffetsStore((s) => s.statusFilter);
    const typeFilter = useEffetsStore((s) => s.typeFilter);
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery({
        queryKey: queryKeys.effets(deferredSearch, statusFilter, companyId, typeFilter),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (typeFilter && typeFilter !== "ALL") params.set("type", typeFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/effets?${params}`);
            return handleApiResponse<EffetsResponse>(res, "chargement effets");
        },
        placeholderData: (prev) => prev,
    });
}

/**
 * Effets émis (`type=EMIS`) pour un statut donné — ex-hook inline de
 * `components/effets/impression-effets-client.tsx` : clé
 * `["effets","EMIS",status,companyId]` (registre `effets.emisList`) et URL
 * identiques. La société vient du **store** (et non de `useActiveCompanyId`) :
 * c'est la source exacte de l'inline, dont la clé de cache ne doit pas bouger.
 */
export function useEmisEffets(status: EffetStatus) {
    const companyId = useCompanyStore((s) => s.selectedCompanyId);

    return useQuery({
        queryKey: rootQueryKeys.effets.emisList(status, companyId),
        queryFn: async () => {
            const params = new URLSearchParams({ type: "EMIS", status });
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/effets?${params}`);
            if (!res.ok) throw new Error("Erreur chargement effets");
            return res.json() as Promise<{ effets: SerializedEffet[] }>;
        },
    });
}

export function useEffetDetail(id: string) {
    const companyId = useCompanyId();

    return useQuery({
        queryKey: queryKeys.effet(id, companyId),
        queryFn: async () => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/effets/${id}?${params}`);
            return handleApiResponse<EffetDetailResponse>(res, "chargement effet");
        },
        enabled: !!id,
    });
}

/** Liste des comptes de la société courante — délègue au hook canonique (`hooks/use-company-bank-accounts.ts`), clé/URL identiques. */
export function useCompanyBankAccounts() {
    return useBankAccountsOfCompany(useCompanyId());
}

export interface DocumentLie {
    id: string;
    numero: string;
    totalTTC: string;
    resteAPayer?: string;
    dateEcheance: string;
}

interface DocumentsLiesResponse {
    documents: DocumentLie[];
}

export function useDocumentsLies(params: {
    type: EffetType;
    entityId?: string | null;
    enabled?: boolean;
}) {
    const { type, entityId, enabled = !!entityId } = params;

    return useQuery({
        queryKey: ["documents-lies", type, entityId] as const,
        queryFn: async () => {
            if (!entityId) return { documents: [] };
            const docType = type === "RECU" ? "invoice" : "achat";
            const res = await fetch(`/api/effets/documents-lies?type=${docType}&entityId=${entityId}`);
            // Garde identique à l'ancien code inline : on renvoie une liste vide au lieu de
            // throw (sinon React Query ferait 3 retries et l'écran afficherait un délai).
            if (!res.ok) return { documents: [] };
            return handleApiResponse<DocumentsLiesResponse>(res, "chargement des documents liés");
        },
        enabled,
    });
}

export interface EcheanceCollision {
    id: string;
    numero: string;
    dateEcheance: string;
}

export function useEcheanceCollision(date: string, companyId: string | null) {
    return useQuery({
        queryKey: ["echeance-collision", date, companyId] as const,
        queryFn: async () => {
            const res = await fetch(`/api/effets/echeance-collision?date=${date}`);
            if (!res.ok) return [] as EcheanceCollision[];
            const data = await handleApiResponse<{ collisions: EcheanceCollision[]; total: number }>(
                res,
                "détection de collision d'échéance",
            );
            return data.collisions;
        },
        enabled: !!date,
    });
}

export interface EcheanceSuggestion {
    date: string;
    label: string;
    effetsCeJour: number;
}

export function useSuggestEcheances() {
    return useMutation({
        mutationFn: async (params: { montant?: string }) => {
            const search = new URLSearchParams();
            if (params.montant) search.set("montant", params.montant);
            const res = await fetch(`/api/effets/suggest-echeances?${search}`);
            // L'ancien handler faisait `if (!res.ok) return` : pas d'erreur remontée, pas d'invalide.
            if (!res.ok) return null;
            return handleApiResponse<{ suggestions: EcheanceSuggestion[] }>(res, "suggestion de dates d'échéance");
        },
    });
}

export interface EcheanceAvenir {
    id: string;
    numero: string;
    fournisseur: string;
    dateEcheance: string;
    montant: string;
    joursDepuisReference: number;
    joursDepuisAujourdhui: number;
}

export interface EcheancesAvenirResponse {
    echeances: EcheanceAvenir[];
    total: number;
    page: number;
    pageSize: number;
}

export function useEcheancesAvenir(params: {
    horizon?: 30 | 60 | 90 | 120 | null;
    page: number;
    pageSize?: number;
}) {
    const { horizon, page, pageSize = 20 } = params;

    return useQuery({
        queryKey: ["echeances-a-venir", horizon ?? "all", page, pageSize] as const,
        queryFn: async () => {
            const search = new URLSearchParams();
            if (horizon) search.set("horizon", String(horizon));
            search.set("page", String(page));
            search.set("pageSize", String(pageSize));
            const res = await fetch(`/api/effets/echeances-a-venir?${search}`);
            return handleApiResponse<EcheancesAvenirResponse>(res, "chargement échéances");
        },
        placeholderData: (prev) => prev,
    });
}

export interface BatchEffetInput {
    montant: number;
    tire: string;
    tireAdresse?: string | null;
    tireBanque?: string | null;
    beneficiaire: string;
    tireurId?: string | null;
    fournisseurId?: string | null;
    companyBankAccountId?: string | null;
    dateCreation: string;
    dateEcheance: string;
    notes?: string | null;
    ordrePaiementNumero?: string | null;
    achatsLies?: { achatId: string; montantAlloue: number }[];
}

export interface BatchCreatePayload {
    type: EffetType;
    effets: BatchEffetInput[];
}

export function useBatchCreateEffets() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (data: BatchCreatePayload) => {
            const res = await fetch("/api/effets/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ effets: SerializedEffet[] }>(res, "création d'effets");
        },
        onError: (err: unknown) =>
            notify.error({
                title: "Création des effets impossible",
                error: err,
                context: "lors de la création groupée d'effets",
            }),
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.effets() });
            qc.invalidateQueries({ queryKey: ["echeances-a-venir"] });
            qc.invalidateQueries({ queryKey: ["documents-lies"] });
            qc.invalidateQueries({ queryKey: ["achats"] });
        },
    });
}

export function useEffetsMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.effets(undefined, undefined, companyId);

    const createEffet = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/effets?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ effet: SerializedEffet }>(res, "création effet");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<EffetsResponse>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticEffet: SerializedEffet = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    type: (data.type as EffetType) ?? "LETTRE_DE_CHANGE",
                    invoiceId: null,
                    montant: (data.montant as string) ?? "0",
                    tire: (data.tire as string) ?? "",
                    tireAdresse: null,
                    tireBanque: null,
                    beneficiaire: (data.beneficiaire as string) ?? "",
                    tireurId: (data.tireurId as string) ?? null,
                    fournisseurId: (data.fournisseurId as string) ?? null,
                    dateCreation: (data.dateCreation as Date) ?? now,
                    dateEcheance: (data.dateEcheance as Date) ?? now,
                    dateRemise: null,
                    endosseLe: null,
                    dateImpaye: null,
                    status: "EN_PORTEFEUILLE" as EffetStatus,
                    tauxEscompte: null,
                    frais: null,
                    netEncaisse: null,
                    endosseA: null,
                    motifImpaye: null,
                    fraisProtet: null,
                    rappel15jEnvoye: false,
                    rappel10jEnvoye: false,
                    rappel5jEnvoye: false,
                    rappelJourEnvoye: false,
                    splitGroup: null,
                    splitIndex: null,
                    splitTotal: null,
                    notes: (data.notes as string) ?? null,
                    ordrePaiementNumero: null,
                    companyId: companyId ?? null,
                    companyBankAccountId: null,
                    createdAt: now,
                    updatedAt: now,
                };
                qc.setQueryData<EffetsResponse>(listKey, {
                    ...previous,
                    effets: [optimisticEffet, ...previous.effets],
                    stats: {
                        ...previous.stats,
                        total: previous.stats.total + 1,
                        enPortefeuille: previous.stats.enPortefeuille + 1,
                        totalMontant: String(
                            parseFloat(previous.stats.totalMontant) + parseFloat(optimisticEffet.montant)
                        ),
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.effets() });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/effets/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedEffet>(res, "mise à jour effet");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.effet(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });

            const previous = qc.getQueryData<EffetDetailResponse>(
                queryKeys.effet(id, companyId),
            );
            if (previous) {
                qc.setQueryData<EffetDetailResponse>(
                    queryKeys.effet(id, companyId),
                    { ...previous, effet: { ...previous.effet, status: status as EffetStatus } },
                );
            }

            const listPrevious = qc.getQueryData<EffetsResponse>(listKey);
            if (listPrevious) {
                qc.setQueryData<EffetsResponse>(listKey, {
                    ...listPrevious,
                    effets: listPrevious.effets.map((e) =>
                        e.id === id ? { ...e, status: status as EffetStatus } : e,
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.effet(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: (_data, _error, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.effets() });
            if (variables?.status === "PAYE") {
                qc.invalidateQueries({ queryKey: ["invoices"] });
                qc.invalidateQueries({ queryKey: ["payments"] });
                qc.invalidateQueries({ queryKey: ["achats"] });
                qc.invalidateQueries({ queryKey: ["dashboard"] });
            }
        },
    });

    const deleteEffet = useMutation({
        mutationFn: async (id: string) => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/effets/${id}?${params}`, { method: "DELETE" });
            return handleApiResponse<{ success: boolean }>(res, "suppression effet");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<EffetsResponse>(listKey);
            if (previous) {
                qc.setQueryData<EffetsResponse>(listKey, {
                    ...previous,
                    effets: previous.effets.filter((e) => e.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.effets() });
        },
    });

    return { createEffet, updateStatus, deleteEffet };
}
