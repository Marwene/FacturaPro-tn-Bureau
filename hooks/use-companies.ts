"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { handleApiResponse, readApiErrorMessage } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import type { CompanySetupInput, CompanyUpdateInput } from "@/lib/schemas/company";
import type { CompanyDetailResponse } from "@/hooks/use-company-query";

export function useCreateCompany() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (data: Record<string, unknown>): Promise<void> => {
            const res = await fetch("/api/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) || "Erreur création entreprise");
            }
            await res.json();
        },
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: queryKeys.companies.all() });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.all() });
        },
    });
}

interface SetupCompanyResponse {
    error?: string;
    company?: { name?: string | null };
}

/** POST /api/setup/company — onboarding : création de la première société, puis session + redirection. */
export function useSetupCompany() {
    const qc = useQueryClient();
    const router = useRouter();
    const { update } = useSession();

    return useMutation({
        mutationFn: async (data: CompanySetupInput): Promise<SetupCompanyResponse> => {
            const res = await fetch("/api/setup/company", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const body = (await res.json()) as SetupCompanyResponse;

            if (!res.ok) {
                throw new Error(body.error ?? "La demande est invalide.");
            }

            return body;
        },
        onSuccess: async (data) => {
            notify.success({
                title: `Société « ${data.company?.name ?? "votre société"} » créée`,
                description: "La configuration a été enregistrée.",
            });
            await update();
            router.push("/");
            router.refresh();
        },
        onError: (err: unknown) => {
            notify.error({ title: "Société non créée", error: err, context: "création de la société" });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.all() });
            qc.invalidateQueries({ queryKey: queryKeys.companies.userCompaniesAll() });
            qc.invalidateQueries({ queryKey: queryKeys.companies.me() });
        },
    });
}

/** PATCH /api/companies/[id] — corps JSON typé ; invalidation seule, les toasts sont passés par le composant (`mutate(vars, { onSuccess, onError })`). */
export function useUpdateCompany(companyId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CompanyUpdateInput) => {
            const res = await fetch(`/api/companies/${companyId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            return handleApiResponse<CompanyDetailResponse>(res, "mise à jour de l'entreprise");
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
            qc.invalidateQueries({ queryKey: queryKeys.companies.all() });
        },
    });
}

export function useDeleteCompany(companyId: string) {
    const qc = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
            if (!res.ok) {
                // Message conservé à l'identique : ApiError préfixerait « API Error <status>: »
                // et changerait le texte du toast.
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error);
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.companies.all() });
            notify.success({ title: "Entreprise supprimée" });
            router.push("/parametres/entreprises");
        },
        onError: (err: unknown) =>
            notify.error({
                title: "Suppression de l'entreprise impossible",
                error: err,
                context: "lors de la suppression de l'entreprise",
            }),
    });
}
