"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleApiResponse, readApiErrorMessage } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import type { SerializedCompanyBankAccount } from "@/lib/types";

interface CompanyBankAccountsResponse {
    accounts: SerializedCompanyBankAccount[];
}

export interface CompanyBankAccountInput {
    nomBanque: string;
    rib: string | null;
    agence: string | null;
    isDefault: boolean;
}

export type CompanyBankAccountUpdateInput = CompanyBankAccountInput & { id: string };

/**
 * GET /api/company-bank-accounts?companyId= — la même clé/cache pour la page
 * Comptes bancaires (companyId de la route) et les sélecteurs effets/cheques
 * (company courante) : une création/mise à jour rafraîchit partout.
 */
export function useCompanyBankAccounts(companyId: string | null) {
    return useQuery<CompanyBankAccountsResponse>({
        queryKey: queryKeys.companies.bankAccounts(companyId),
        queryFn: async () => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/company-bank-accounts?${params}`);
            return handleApiResponse<CompanyBankAccountsResponse>(res, "chargement comptes bancaires");
        },
        enabled: !!companyId,
    });
}

export function useCreateCompanyBankAccount(companyId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CompanyBankAccountInput): Promise<void> => {
            const res = await fetch(`/api/company-bank-accounts?companyId=${companyId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body));
            }
            await res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.bankAccounts(companyId) });
        },
    });
}

export function useUpdateCompanyBankAccount(companyId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...payload }: CompanyBankAccountUpdateInput): Promise<void> => {
            const res = await fetch(`/api/company-bank-accounts/${id}?companyId=${companyId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body));
            }
            await res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.bankAccounts(companyId) });
        },
    });
}

export function useDeleteCompanyBankAccount(companyId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const res = await fetch(`/api/company-bank-accounts/${id}?companyId=${companyId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body));
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.bankAccounts(companyId) });
        },
    });
}
