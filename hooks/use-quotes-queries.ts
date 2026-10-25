"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedQuote, QuoteStatus } from "@/lib/types";

interface QuotesResponse {
    quotes: SerializedQuote[];
    stats: {
        total: number;
        montantTotal: string;
        tauxAcceptation: number;
        enAttente: number;
    };
}

export function useQuotes(search?: string, status?: string) {
    const companyId = useCompanyId();
    return useQuery<QuotesResponse>({
        queryKey: ["quotes", search, status, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (status && status !== "ALL") params.set("status", status);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/quotes?${params}`);
            if (!res.ok) throw new Error("Failed to fetch quotes");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });
}

export function useQuote(id: string) {
    const companyId = useCompanyId();
    return useQuery<{ quote: SerializedQuote }>({
        queryKey: ["quotes", id, companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`);
            if (!res.ok) throw new Error("Failed to fetch quote");
            return res.json();
        },
        enabled: !!id,
    });
}

export function useConvertQuoteToInvoice() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ convertToInvoice: true }),
            });
            if (!res.ok) throw new Error("Erreur conversion");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}

export function useCreateQuote() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création devis");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
    });
}

export function useUpdateQuoteStatus() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: QuoteStatus;
        }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Erreur mise à jour statut");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}

export function useDeleteQuote() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/quotes/${id}?${params}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erreur suppression");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}
