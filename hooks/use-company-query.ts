"use client";

import { useQuery } from "@tanstack/react-query";
import { handleApiResponse } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export interface CompanyDetail {
    id: string;
    name: string;
    type: string;
    devise: string;
    logo?: string;
    adresse?: string;
    ville?: string;
    codePostal?: string;
    telephone?: string;
    email?: string;
    siteWeb?: string;
    matriculeFiscal?: string;
    ribBancaire?: string;
    banque?: string;
    seuilSplitEffet?: string;
    prefixeFacture?: string;
    prefixeDevis?: string;
    prefixeBL?: string;
    tauxTVADefaut?: string;
    tauxFodecDefaut?: string;
    _count: {
        invoices: number;
        users: number;
        userCompanies: number;
    };
}

export interface CompanyDetailResponse {
    company: CompanyDetail;
}

export function useCompany(id: string | null) {
    return useQuery<CompanyDetailResponse>({
        queryKey: queryKeys.companies.detail(id),
        queryFn: async () => {
            const res = await fetch(`/api/companies/${id}`);
            return handleApiResponse<CompanyDetailResponse>(res, "chargement de l'entreprise");
        },
        enabled: !!id,
        retry: false,
    });
}
