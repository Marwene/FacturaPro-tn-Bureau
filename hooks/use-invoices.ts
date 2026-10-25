"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useInvoicesStore } from "@/lib/stores/invoices-store";
import type { SerializedInvoice, InvoiceStatus, SerializedPayment } from "@/lib/types";
import { useDeferredValue } from "react";
import { handleApiResponse } from "@/lib/api-error";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    invoices: (search?: string, status?: string, companyId?: string | null) =>
        ["invoices", search, status, companyId] as const,
    invoice: (id: string, companyId?: string | null) => ["invoices", id, companyId] as const,
    payments: (invoiceId?: string) => ["payments", invoiceId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

// ─── useInvoiceList ──────────────────────────────────────────────────────────

interface InvoicesResponse {
    invoices: SerializedInvoice[];
    stats: {
        totalFacture: string;
        totalFactures: number;
        encaisse: string;
        paidCount: number;
        enAttente: string;
        pendingCount: number;
        enRetard: string;
        overdueCount: number;
    };
}

export function useInvoiceList() {
    const searchInput = useInvoicesStore((s) => s.searchInput);
    const statusFilter = useInvoicesStore((s) => s.statusFilter);
    const companyId = useCompanyId();
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery<InvoicesResponse>({
        queryKey: queryKeys.invoices(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/invoices?${params}`);
            return handleApiResponse<InvoicesResponse>(res, "chargement factures");
        },
        placeholderData: (prev) => prev,
    });
}

// ─── useInvoiceDetail ────────────────────────────────────────────────────────

export function useInvoiceDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.invoice(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/invoices/${id}?${params}`);
            return handleApiResponse<{ invoice: SerializedInvoice }>(res, "chargement facture");
        },
        enabled: !!id,
    });
}

// ─── useExchangeRate ─────────────────────────────────────────────────────────

export function useExchangeRate(devise: string, enabled: boolean) {
    return useQuery({
        queryKey: ["exchange-rate", devise],
        queryFn: async () => {
            const res = await fetch(`https://open.er-api.com/v6/latest/${devise}`);
            const data = await handleApiResponse<{ rates?: { TND?: number } }>(res, "récupération taux de change");
            return data?.rates?.TND ? Number(data.rates.TND).toFixed(4) : null;
        },
        enabled: enabled && devise !== "TND",
        staleTime: 300_000,
        retry: 1,
    });
}

// ─── useInvoiceMutations (with Optimistic UI) ────────────────────────────────

export function useInvoiceMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const listKey = queryKeys.invoices(undefined, undefined, companyId);

    const createInvoice = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/invoices?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedInvoice>(res, "création facture");
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<InvoicesResponse>(listKey);
            if (previous) {
                const now = new Date();
                const optimisticInvoice = {
                    id: `temp-${Date.now()}`,
                    numero: "...",
                    tiersId: (data.tiersId as string) ?? "",
                    dateEmission: now,
                    dateEcheance: null,
                    baseHT: "0",
                    totalHT: "0",
                    totalTVA: "0",
                    totalFodec: "0",
                    totalRetenue: "0",
                    totalTTC: "0",
                    montantPaye: "0",
                    resteAPayer: "0",
                    status: "BROUILLON" as InvoiceStatus,
                    notes: null,
                    bcViseActif: false,
                    bcViseNumero: null,
                    dateSN: null,
                    poids: null,
                    poidsBrut: null,
                    nbColis: null,
                    devise: (data.devise as string) ?? "TND",
                    tauxChange: null,
                    montantTND: null,
                    createdAt: now,
                    updatedAt: now,
                    tiers: data.tiers as SerializedInvoice["tiers"],
                    lines: [],
                    payments: [],
                } satisfies SerializedInvoice;
                qc.setQueryData<InvoicesResponse>(listKey, {
                    ...previous,
                    invoices: [optimisticInvoice, ...previous.invoices],
                    stats: {
                        ...previous.stats,
                        totalFactures: previous.stats.totalFactures + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.invoices() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/invoices/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            return handleApiResponse<SerializedInvoice>(res, "mise à jour statut");
        },
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: queryKeys.invoice(id, companyId) });
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<{ invoice: SerializedInvoice }>(
                queryKeys.invoice(id, companyId)
            );
            if (previous) {
                qc.setQueryData<{ invoice: SerializedInvoice }>(
                    queryKeys.invoice(id, companyId),
                    { ...previous, invoice: { ...previous.invoice, status } }
                );
            }
            const listPrevious = qc.getQueryData<InvoicesResponse>(listKey);
            if (listPrevious) {
                qc.setQueryData<InvoicesResponse>(listKey, {
                    ...listPrevious,
                    invoices: listPrevious.invoices.map((i) =>
                        i.id === id ? { ...i, status } as SerializedInvoice : i
                    ),
                });
            }
            return { detailPrevious: previous, listPrevious };
        },
        onError: (_err, { id }, context) => {
            if (context?.detailPrevious) {
                qc.setQueryData(queryKeys.invoice(id, companyId), context.detailPrevious);
            }
            if (context?.listPrevious) {
                qc.setQueryData(listKey, context.listPrevious);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.invoices() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteInvoice = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/invoices/${id}?${params}`, {
                method: "DELETE",
            });
            return handleApiResponse<{ success: boolean }>(res, "suppression facture");
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: listKey });
            const previous = qc.getQueryData<InvoicesResponse>(listKey);
            if (previous) {
                qc.setQueryData<InvoicesResponse>(listKey, {
                    ...previous,
                    invoices: previous.invoices.filter((i) => i.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) qc.setQueryData(listKey, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.invoices() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createInvoice, updateStatus, deleteInvoice };
}

// ─── useCreatePaymentMutation ────────────────────────────────────────────────

export function useCreatePaymentMutation() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    return useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/payments?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleApiResponse<SerializedPayment>(res, "enregistrement paiement");
        },
        onMutate: async (data) => {
            const invoiceId = data.invoiceId as string;
            await qc.cancelQueries({ queryKey: queryKeys.payments(invoiceId) });
            await qc.cancelQueries({ queryKey: queryKeys.invoice(invoiceId, companyId) });
            await qc.cancelQueries({ queryKey: queryKeys.invoices() });
        },
        onSettled: (_data, _err, variables) => {
            const invoiceId = variables.invoiceId as string;
            qc.invalidateQueries({ queryKey: queryKeys.invoice(invoiceId, companyId) });
            qc.invalidateQueries({ queryKey: queryKeys.payments(invoiceId) });
            qc.invalidateQueries({ queryKey: queryKeys.invoices() });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });
}
