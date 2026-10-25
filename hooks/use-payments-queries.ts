"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedPayment, PaymentMethod } from "@/lib/types";

interface PaymentsResponse {
    payments: SerializedPayment[];
    stats: {
        total: number;
        totalEncaisse: string;
        methodBreakdown?: Record<string, { count: number; total: string }>;
    };
}

type PaymentsListParams = {
    search?: string;
    method?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
};

export function usePayments(invoiceId?: string) {
    const companyId = useCompanyId();
    return useQuery<PaymentsResponse>({
        queryKey: ["payments", invoiceId, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (invoiceId) params.set("invoiceId", invoiceId);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/payments?${params}`);
            if (!res.ok) throw new Error("Failed to fetch payments");
            return res.json();
        },
    });
}

export function useCreatePayment() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/payments?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur enregistrement paiement");
            }
            return res.json();
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: ["payments"] });
            const d = data as Record<string, unknown>;
            const now = new Date();
            const optimisticPayment: SerializedPayment = {
                id: `temp-${Date.now()}`,
                invoiceId: (d.invoiceId as string) ?? null,
                achatId: (d.achatId as string) ?? null,
                tiersId: (d.tiersId as string) ?? "",
                montant: (d.montant as string) ?? "0",
                methode: (d.methode as PaymentMethod) ?? "ESPECES",
                status: (d.methode as string) === "VIREMENT" ? "EN_ATTENTE" : "CONFIRME",
                reference: (d.reference as string) ?? null,
                dateReglement: (d.dateReglement as Date) ?? now,
                notes: (d.notes as string) ?? null,
                createdAt: now,
            };
            const previousCaches: Array<{ key: unknown[]; data: PaymentsResponse }> = [];
            for (const [key, value] of qc.getQueriesData<PaymentsResponse>({ queryKey: ["payments"] })) {
                if (value && Array.isArray(value.payments)) {
                    previousCaches.push({ key: key as unknown[], data: value });
                    qc.setQueryData<PaymentsResponse>(key as unknown[], {
                        ...value,
                        payments: [optimisticPayment, ...value.payments],
                        stats: {
                            ...value.stats,
                            total: value.stats.total + 1,
                        },
                    });
                }
            }
            return { previousCaches };
        },
        onError: (_err, _data, context) => {
            if (context?.previousCaches) {
                for (const { key, data } of context.previousCaches) {
                    qc.setQueryData(key, data);
                }
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["payments"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["tresorerie"] });
        },
    });
}

export function usePaymentsList(params?: PaymentsListParams) {
    const companyId = useCompanyId();
    const { search, method, status, dateFrom, dateTo } = params ?? {};
    return useQuery<PaymentsResponse>({
        queryKey: ["payments", "list", search, method, status, dateFrom, dateTo, companyId] as const,
        queryFn: async () => {
            const sp = new URLSearchParams();
            if (search) sp.set("search", search);
            if (method && method !== "ALL") sp.set("method", method);
            if (status && status !== "ALL") sp.set("status", status);
            if (dateFrom) sp.set("dateFrom", dateFrom);
            if (dateTo) sp.set("dateTo", dateTo);
            if (companyId) sp.set("companyId", companyId);
            const res = await fetch(`/api/payments?${sp}`);
            if (!res.ok) throw new Error("Failed to fetch payments");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });
}

export function useUpdatePayment() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; reference?: string | null; notes?: string | null; dateReglement?: string; status?: string }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/payments/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification paiement");
            }
            return res.json();
        },
        onMutate: async ({ id, ...data }) => {
            await qc.cancelQueries({ queryKey: ["payments"] });
            const previousCaches: Array<{ key: unknown[]; data: PaymentsResponse }> = [];
            for (const [key, value] of qc.getQueriesData<PaymentsResponse>({ queryKey: ["payments"] })) {
                if (value && Array.isArray(value.payments)) {
                    previousCaches.push({ key: key as unknown[], data: value });
                    qc.setQueryData<PaymentsResponse>(key as unknown[], {
                        ...value,
                        payments: value.payments.map((p) =>
                            p.id === id ? { ...p, ...data } as SerializedPayment : p
                        ),
                    });
                }
            }
            return { previousCaches };
        },
        onError: (_err, _data, context) => {
            if (context?.previousCaches) {
                for (const { key, data } of context.previousCaches) {
                    qc.setQueryData(key, data);
                }
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["payments"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["tresorerie"] });
        },
    });
}

export function useDeletePayment() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/payments/${id}?${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression paiement");
            }
            return res.json();
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["payments"] });
            const previousCaches: Array<{ key: unknown[]; data: PaymentsResponse }> = [];
            for (const [key, value] of qc.getQueriesData<PaymentsResponse>({ queryKey: ["payments"] })) {
                if (value && Array.isArray(value.payments)) {
                    previousCaches.push({ key: key as unknown[], data: value });
                    qc.setQueryData<PaymentsResponse>(key as unknown[], {
                        ...value,
                        payments: value.payments.filter((p) => p.id !== id),
                        stats: {
                            ...value.stats,
                            total: Math.max(0, value.stats.total - 1),
                        },
                    });
                }
            }
            return { previousCaches };
        },
        onError: (_err, _id, context) => {
            if (context?.previousCaches) {
                for (const { key, data } of context.previousCaches) {
                    qc.setQueryData(key, data);
                }
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["payments"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["tresorerie"] });
        },
    });
}
