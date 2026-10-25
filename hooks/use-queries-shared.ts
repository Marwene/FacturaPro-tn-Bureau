"use client";

import { useCompanyStore } from "@/lib/stores/company-store";

export function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

export function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
    invoices: (search?: string, status?: string, companyId?: string | null) =>
        ["invoices", search, status, companyId] as const,
    invoice: (id: string, companyId?: string | null) => ["invoices", id, companyId] as const,
    clients: (search?: string) => ["clients", search] as const,
    products: (search?: string, categorie?: string, companyId?: string | null) =>
        ["products", search, categorie, companyId] as const,
    quotes: (search?: string, status?: string, companyId?: string | null) =>
        ["quotes", search, status, companyId] as const,
    cheques: (companyId?: string | null) => ["cheques", companyId] as const,
    payments: (invoiceId?: string) => ["payments", invoiceId] as const,
    paymentsList: (search?: string, method?: string, dateFrom?: string, dateTo?: string, companyId?: string | null) =>
        ["payments", "list", search, method, dateFrom, dateTo, companyId] as const,
    paymentById: (id: string, companyId?: string | null) => ["payments", id, companyId] as const,
    deliveryNotes: (search?: string, status?: string, companyId?: string | null) =>
        ["deliveryNotes", search, status, companyId] as const,
    reports: (year: string, companyId?: string | null) => ["reports", year, companyId] as const,
    settings: ["settings"] as const,
    ngpCodes: (companyId?: string | null) => ["ngp-codes", companyId] as const,
    exports: (search?: string, status?: string, companyId?: string | null) =>
        ["exports", search, status, companyId] as const,
    exportById: (id: string, companyId?: string | null) => ["exports", id, companyId] as const,
};
