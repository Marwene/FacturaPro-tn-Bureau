"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useBLListStore, useBLFormStore } from "@/lib/stores/bl-store";
import type { SerializedDeliveryNote, SerializedDeliveryNoteLine, DeliveryNoteStatus } from "@/lib/types";
import { useDeferredValue } from "react";
import { handleApiResponse } from "@/lib/api-error";
import { queryKeys as rootQueryKeys } from "@/lib/query-keys";
import { parseTunisianNumber } from "@/lib/decimal";
import Big from "big.js";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    bls: (search?: string, status?: string, companyId?: string | null) =>
        ["delivery-notes", search, status, companyId] as const,
    bl: (id: string, companyId?: string | null) => ["delivery-notes", id, companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

export function useBLList() {
    const searchInput = useBLListStore((s) => s.searchInput);
    const statusFilter = useBLListStore((s) => s.statusFilter);
    const companyId = useCompanyId();
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery({
        queryKey: queryKeys.bls(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/bons-livraison?${params}`);
            return handleApiResponse<{
                deliveryNotes: SerializedDeliveryNote[];
                stats: { total: number; totalTTC: string; livres: number; brouillons: number };
            }>(res, "chargement BL");
        },
        placeholderData: (prev) => prev,
    });
}

export function useBLDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.bl(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`);
            return handleApiResponse<{ deliveryNote: SerializedDeliveryNote }>(res, "chargement BL");
        },
        enabled: !!id,
    });
}

export function useBLTauxBCT(devise: string, enabled: boolean) {
    const query = useQuery<string | null>({
        queryKey: ["taux-bct", devise],
        queryFn: async () => {
            const res = await fetch(`/api/taux-bct?devise=${devise}`);
            const data = await handleApiResponse<{ success?: boolean; taux?: string }>(res, "récupération taux BCT");
            return data?.success && data?.taux ? Number(data.taux).toFixed(3) : null;
        },
        enabled: enabled && devise !== "TND",
        staleTime: 300_000,
        retry: 1,
    });

    // Sync du taux dans le store BL — ex-useEffect [query.data, setTauxChange].
    // Le setter vit dans le queryFn d'une query de synchro (hors cycle de
    // rendu, écriture via getState() — pattern customizer-studio /
    // scan-upload-screen, pas de warning react#31730) plutôt que dans celui de
    // la query taux : un run de queryFn implique un fetch, or l'ex-effet se
    // déclenchait aussi quand `data` revenait depuis le cache sans refetch
    // (bascule devise EUR→USD→EUR sous les 300 s de staleTime), auquel cas le
    // taux serait resté celui de l'autre devise. `enabled` reprend la garde
    // `query.data` de l'effet, la queryKey reprend devise + valeur reçue,
    // staleTime 0 = run à chaque montage comme l'ex-effet, refetchOnReconnect
    // false = aucun run au-delà de ses déclencheurs.
    useQuery<string | null>({
        queryKey: ["taux-bct-bl-sync", devise, query.data],
        enabled: !!query.data,
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            const taux = query.data;
            if (!taux) return null;
            const store = useBLFormStore.getState();
            if (store.tauxChange !== taux) store.setTauxChange(taux);
            return taux;
        },
    });

    return query;
}

/**
 * Calculer et stocker montantTND — affiché dans BLFormVise (saisie manuelle
 * possible) ET lu par buildPayload()/buildInvoicePayload().
 * Ex-useEffect [totalTTC.toFixed(3), form.tauxChange, form.blViseActif,
 * form.devise] de `components/bons-livraison/nouveau-bl-client.tsx` → query de
 * dérivation : la queryKey reprend les 4 dépendances exactes de l'effet
 * (staleTime 0 = run à chaque montage et à chaque bascule de clé, comme deps,
 * donc aucun run supplémentaire au focus /reconnexion qui écraserait une saisie
 * manuelle), le queryFn reproduit les mêmes branches et gardes (dont
 * `computed !== montantTND`), et l'écriture se fait via getState() hors cycle
 * de rendu (pas de warning react#31730 : BLFormVise / BLFormLines /
 * NouveauBLActions sont abonnés au store).
 */
export function useBLMontantTndSync(
    totalTTC: Big,
    tauxChange: string,
    blViseActif: boolean,
    devise: string,
) {
    return useQuery<string>({
        queryKey: rootQueryKeys.bonsLivraison.montantTnd(totalTTC.toFixed(3), tauxChange, blViseActif, devise),
        staleTime: 0,
        retry: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            const store = useBLFormStore.getState();
            if (blViseActif && devise !== "TND" && tauxChange && totalTTC.gt(0)) {
                const tc = parseTunisianNumber(tauxChange);
                if (tc && tc > 0) {
                    const computed = totalTTC.times(new Big(tc)).toFixed(3);
                    if (computed !== store.montantTND) {
                        store.setMontantTND(computed);
                    }
                }
            } else if (blViseActif && (devise === "TND" || !tauxChange || totalTTC.eq(0))) {
                if (store.montantTND !== "") {
                    store.setMontantTND("");
                }
            }
            return useBLFormStore.getState().montantTND;
        },
    });
}

export function useBLMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.bls(undefined, undefined, companyId);

    const createBL = useMutation({
        mutationFn: async (data: Record<string, unknown>): Promise<{ deliveryNote: SerializedDeliveryNote }> => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<{ deliveryNote: SerializedDeliveryNote }>(res, "création BL");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ deliveryNotes: SerializedDeliveryNote[]; stats: { total: number; totalTTC: string; livres: number; brouillons: number } }>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticBL: SerializedDeliveryNote = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    tiersId: (data.tiersId as string) ?? "",
                    dateCreation: (data.dateCreation as Date) ?? now,
                    dateLivraison: (data.dateLivraison as Date | null) ?? null,
                    baseHT: (data.baseHT as string) ?? "0",
                    totalHT: (data.totalHT as string) ?? "0",
                    totalTVA: (data.totalTVA as string) ?? "0",
                    totalFodec: (data.totalFodec as string) ?? "0",
                    totalTTC: (data.totalTTC as string) ?? "0",
                    status: "BROUILLON" as DeliveryNoteStatus,
                    notes: (data.notes as string) ?? null,
                    blViseActif: false,
                    snNumero: null,
                    dateSN: null,
                    poidsBrut: null,
                    poidsNet: null,
                    nbColis: null,
                    devise: "TND",
                    tauxChange: null,
                    montantTND: null,
                    createdAt: now,
                    updatedAt: now,
                };
                qc.setQueryData(listKey, {
                    ...previous,
                    deliveryNotes: [optimisticBL, ...previous.deliveryNotes],
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
            qc.invalidateQueries({ queryKey: queryKeys.bls() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: DeliveryNoteStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedDeliveryNote>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.bl(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ deliveryNote: SerializedDeliveryNote }>(
                queryKeys.bl(id, companyId)
            );
            if (previous) {
                qc.setQueryData<{ deliveryNote: SerializedDeliveryNote }>(
                    queryKeys.bl(id, companyId),
                    { ...previous, deliveryNote: { ...previous.deliveryNote, status } }
                );
            }
            const listPrevious = qc.getQueryData<{ deliveryNotes: SerializedDeliveryNote[] }>(listKey);
            if (listPrevious) {
                qc.setQueryData<{ deliveryNotes: SerializedDeliveryNote[] }>(listKey, {
                    ...listPrevious,
                    deliveryNotes: listPrevious.deliveryNotes.map((b) =>
                        b.id === id ? { ...b, status } as SerializedDeliveryNote : b
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.bl(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bls() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteBL = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression BL");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ deliveryNotes: SerializedDeliveryNote[] }>(listKey);
            if (previous) {
                qc.setQueryData<{ deliveryNotes: SerializedDeliveryNote[] }>(listKey, {
                    ...previous,
                    deliveryNotes: previous.deliveryNotes.filter((b) => b.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bls() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const convertToInvoice = useMutation({
        mutationFn: async (bl: SerializedDeliveryNote) => {
            const params = companyParam(companyId);
            const detailRes = await fetch(`/api/bons-livraison/${bl.id}?${params}`);
            const detail = await handleApiResponse<{ deliveryNote: { lines?: SerializedDeliveryNoteLine[] } }>(detailRes, `Impossible de charger le ${bl.numero}`);
            const lines = (detail.deliveryNote?.lines ?? []) as SerializedDeliveryNoteLine[];
            const isVise = bl.blViseActif;
            const payload: Record<string, unknown> = {
                tiersId: bl.tiersId,
                dateEmission: new Date().toISOString().split("T")[0],
                dateEcheance: bl.dateLivraison ? new Date(bl.dateLivraison).toISOString().split("T")[0] : null,
                notes: bl.notes ? `${bl.notes} (Converti depuis le ${bl.numero})` : `Converti depuis le ${bl.numero}`,
                ...(isVise
                    ? {
                        bcViseActif: true,
                        bcViseNumero: bl.snNumero,
                        dateSN: bl.dateSN,
                        poids: bl.poidsNet ? parseFloat(bl.poidsNet) : null,
                        poidsBrut: bl.poidsBrut ? parseFloat(bl.poidsBrut) : null,
                        nbColis: bl.nbColis,
                        devise: bl.devise,
                        tauxChange: bl.tauxChange ? parseFloat(bl.tauxChange) : null,
                        montantTND: bl.montantTND ? parseFloat(bl.montantTND) : null,
                    }
                    : {}),
                lines: lines.map((l: SerializedDeliveryNoteLine) => ({
                    productId: l.productId,
                    description: l.description,
                    quantite: parseFloat(l.quantite),
                    prixHT: parseFloat(l.prixHT),
                    remise: parseFloat(l.remise),
                    tauxTVA: isVise ? 0 : parseFloat(l.tauxTVA),
                    fodec: l.fodec,
                    tauxFodec: parseFloat(l.tauxFodec),
                })),
            };
            const res = await fetch(`/api/invoices?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            return handleApiResponse<{ invoice: SerializedDeliveryNote }>(res, "conversion en facture");
        },
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: ["invoices"] });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.bls() });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createBL, updateStatus, deleteBL, convertToInvoice };
}
