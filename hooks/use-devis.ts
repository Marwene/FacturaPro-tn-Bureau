"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useDevisListStore, useDevisFormStore } from "@/lib/stores/devis-store";
import type { SerializedQuote, SerializedInvoice, QuoteStatus } from "@/lib/types";
import { useDeferredValue } from "react";
import { handleApiResponse } from "@/lib/api-error";
import { queryKeys as rootQueryKeys } from "@/lib/query-keys";
import Big from "big.js";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    quotes: (search?: string, status?: string, companyId?: string | null) =>
        ["quotes", search, status, companyId] as const,
    quote: (id: string, companyId?: string | null) => ["quotes", id, companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

// ─── useDevisTauxBCT ─────────────────────────────────────────────────────────

export function useDevisTauxBCT(devise: string, enabled: boolean) {
    return useQuery<string | null>({
        queryKey: ["taux-bct-devis", devise],
        queryFn: async () => {
            const res = await fetch(`/api/taux-bct?devise=${devise}`);
            const data = await handleApiResponse<{ success?: boolean; taux?: string }>(res, "récupération taux BCT");
            return data?.success && data?.taux ? Number(data.taux).toFixed(4) : null;
        },
        enabled: enabled && devise !== "TND",
        staleTime: 300_000,
        retry: 1,
    });
}

// ─── Queries « init / sync » du formulaire (ex-inline de nouveau-devis-client) ─

/**
 * Auto-remplir la date d'expiration (10 jours après la création).
 * Ex-useEffect [form.dateCreation] → « init store » via TanStack : le queryFn
 * tourne hors cycle de rendu, donc l'écriture Zustand ne déclenche pas le
 * warning React « Cannot update a component while rendering… » (react#31730)
 * qu'aurait un ajustement au rendu — NouveauDevisActions est abonné au même
 * store dès le premier render. queryKey = dateCreation → mêmes déclencheurs
 * que l'ex-effet (montage + changement de dateCreation ; aucune exécution sur
 * une simple édition de dateExpiration) ; staleTime 0 = exécution à chaque
 * montage, comme l'ex-effet ; la garde d'idempotence reprend `!dateExpiration`.
 */
export function useDevisDateExpirationInit(dateCreation: string) {
    return useQuery({
        queryKey: rootQueryKeys.devis.dateExpirationInit(dateCreation),
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            const store = useDevisFormStore.getState();
            if (store.dateCreation && !store.dateExpiration) {
                const d = new Date(store.dateCreation);
                d.setDate(d.getDate() + 10);
                store.setDateExpiration(d.toISOString().split("T")[0]);
            }
            return store.dateExpiration;
        },
    });
}

/**
 * Sync le taux BCT dans le store pour que buildPayload() l'inclue.
 * Ex-useEffect [tauxBCTQuery.data] → query de synchronisation : `enabled`
 * reprend la garde `data != null` de l'effet, la queryKey reprend devise +
 * valeur reçue (toute nouvelle valeur = un run, y compris le retour à une
 * valeur déjà en cache sans refetch, comme deps [tauxBCTQuery.data]),
 * staleTime 0 = run à chaque montage comme l'ex-effet, `refetchOnReconnect`
 * false = aucun run au-delà des déclencheurs de l'ex-effet, et l'écriture se
 * fait via getState() hors cycle de rendu.
 */
export function useDevisTauxChangeSync(devise: string, taux: string | null | undefined) {
    return useQuery<string | null>({
        queryKey: rootQueryKeys.taux.bctDevisSync(devise, taux),
        enabled: taux != null,
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            if (taux == null) return null;
            const store = useDevisFormStore.getState();
            if (store.tauxChange !== taux) store.setTauxChange(taux);
            return taux;
        },
    });
}

/**
 * Calculer et stocker montantTND quand le taux change — lu uniquement par
 * buildPayload() (l'écran affiche « Équivalent TND » calculé en direct).
 * Ex-useEffect [tauxChange, form.devise, totalTTC] → query de dérivation : la
 * queryKey reprend les 3 dépendances exactes de l'effet (staleTime 0 = run à
 * chaque montage et à chaque bascule de clé, comme deps), le queryFn
 * reproduit la formule ligne pour ligne, et l'écriture se fait via getState()
 * hors cycle de rendu.
 */
export function useDevisMontantTndSync(tauxChange: string, devise: string, totalTTC: Big) {
    return useQuery<string>({
        queryKey: rootQueryKeys.devis.montantTnd(tauxChange, devise, totalTTC.toString()),
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            const store = useDevisFormStore.getState();
            if (devise !== "TND" && tauxChange) {
                const timbreFiscal = devise === "TND" ? new Big("1.000") : new Big(0);
                const totalTTCWithTimbre = totalTTC.plus(timbreFiscal);
                const montant = totalTTCWithTimbre.times(new Big(tauxChange));
                const next = montant.toFixed(4);
                if (store.montantTND !== next) store.setMontantTND(next);
            } else if (store.montantTND !== "") {
                store.setMontantTND("");
            }
            return useDevisFormStore.getState().montantTND;
        },
    });
}

// ─── useDevisList ────────────────────────────────────────────────────────────

export function useDevisList() {
    const searchInput = useDevisListStore((s) => s.searchInput);
    const statusFilter = useDevisListStore((s) => s.statusFilter);
    const companyId = useCompanyId();
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery({
        queryKey: queryKeys.quotes(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/quotes?${params}`);
            return handleApiResponse<{
                quotes: SerializedQuote[];
                stats: { total: number; brouillon: number; envoye: number; accepte: number; montantTotal: string; tauxAcceptation: number; enAttente: number };
            }>(res, "chargement devis");
        },
        placeholderData: (prev) => prev,
    });
}

// ─── useDevisDetail ──────────────────────────────────────────────────────────

export function useDevisDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.quote(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`);
            return handleApiResponse<{ quote: SerializedQuote }>(res, "chargement devis");
        },
        enabled: !!id,
    });
}

// ─── useDevisMutations ───────────────────────────────────────────────────────

export function useDevisMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.quotes(undefined, undefined, companyId);

    const createQuote = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ quote: SerializedQuote }>(res, "création devis");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ quotes: SerializedQuote[]; stats: { total: number; brouillon: number; envoye: number; accepte: number; montantTotal: string; tauxAcceptation: number; enAttente: number } }>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticQuote = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    tiersId: (data.tiersId as string) ?? "",
                    dateCreation: now,
                    dateExpiration: null,
                    baseHT: "0",
                    totalHT: "0",
                    totalTVA: "0",
                    totalFodec: "0",
                    totalTTC: "0",
                    status: "BROUILLON" as QuoteStatus,
                    notes: null,
                    invoiceId: null,
                    devise: (data.devise as string) ?? "TND",
                    tauxChange: null,
                    montantTND: null,
                    createdAt: now,
                    updatedAt: now,
                    tiers: data.tiers as SerializedQuote["tiers"],
                    lines: [],
                } satisfies SerializedQuote;
                qc.setQueryData(listKey, {
                    ...previous,
                    quotes: [optimisticQuote, ...previous.quotes],
                    stats: { ...previous.stats, total: previous.stats.total + 1, brouillon: previous.stats.brouillon + 1 },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedQuote>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.quote(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ quote: SerializedQuote }>(queryKeys.quote(id, companyId));
            if (previous) {
                qc.setQueryData<{ quote: SerializedQuote }>(queryKeys.quote(id, companyId), {
                    ...previous, quote: { ...previous.quote, status },
                });
            }
            const listPrevious = qc.getQueryData<{ quotes: SerializedQuote[] }>(listKey);
            if (listPrevious) {
                qc.setQueryData<{ quotes: SerializedQuote[] }>(listKey, {
                    ...listPrevious,
                    quotes: listPrevious.quotes.map((q) =>
                        q.id === id ? { ...q, status } as SerializedQuote : q
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) qc.setQueryData(queryKeys.quote(id, companyId), context.detailPrevious);
            if (context?.listPrevious) qc.setQueryData(listKey, context.listPrevious);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const convertToInvoice = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}/convert?${params}`, { method: "POST" });
            return handleApiResponse<{ invoice: SerializedInvoice }>(res, "conversion devis");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            await qc.cancelQueries({ queryKey: ["invoices"] });
            const listPrevious = qc.getQueryData<{ quotes: SerializedQuote[]; stats: { total: number; brouillon: number; envoye: number; accepte: number; montantTotal: string; tauxAcceptation: number; enAttente: number } }>(listKey);
            if (listPrevious) {
                qc.setQueryData(listKey, {
                    ...listPrevious,
                    quotes: listPrevious.quotes.filter((q) => q.id !== id),
                    stats: { ...listPrevious.stats, total: Math.max(0, listPrevious.stats.total - 1) },
                });
            }
            return { listPrevious };
        },
        onError: (_err, _id, context) => {
            if (context?.listPrevious) qc.setQueryData(listKey, context.listPrevious);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteQuote = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`, { method: "DELETE" });
            return handleApiResponse<{ success: boolean }>(res, "suppression devis");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ quotes: SerializedQuote[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ quotes: SerializedQuote[] }>(listKey, {
                    ...previous, quotes: previous.quotes.filter((q) => q.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createQuote, updateStatus, convertToInvoice, deleteQuote };
}
