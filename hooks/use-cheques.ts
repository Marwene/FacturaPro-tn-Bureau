"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import type { SerializedCheque } from "@/lib/types";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

interface ChequesResponse {
    cheques: SerializedCheque[];
    stats: {
        recusCount: number;
        recusMontant: string;
        emisCount: number;
        emisMontant: string;
        enAttenteCount: number;
        enAttenteMontant: string;
        encaissesCount: number;
        encaissesMontant: string;
    };
}

export function useChequesList() {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: ["cheques", companyId] as const,
        queryFn: async () => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/cheques?${params}`);
            if (!res.ok) throw new Error("Erreur chargement chèques");
            return res.json() as Promise<ChequesResponse>;
        },
        placeholderData: (prev) => prev,
    });
}

export function useChequesMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    const encaisserCheque = useMutation({
        mutationFn: async (id: string) => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/cheques/${id}/encaisser?${params}`, {
                method: "POST",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur encaissement chèque");
            }
            return res.json();
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["cheques", companyId] });
            const previous = qc.getQueryData<ChequesResponse>(["cheques", companyId]);
            if (previous) {
                qc.setQueryData<ChequesResponse>(["cheques", companyId], {
                    ...previous,
                    cheques: previous.cheques.map((c) =>
                        c.id === id ? { ...c, status: "ENCAISSE" } : c
                    ),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                qc.setQueryData(["cheques", companyId], context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["cheques"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["payments"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });

    const createCheque = useMutation({
        mutationFn: async (data: {
            numero: string;
            banque?: string;
            type: "RECU" | "EMIS";
            beneficiaire: string;
            montant: number;
            dateEmission: string;
            dateEcheance: string;
            tiersId?: string;
            invoiceId?: string;
            banqueBeneficiaire?: string;
            notes?: string;
        }) => {
            const params = companyId ? `companyId=${companyId}` : "";
            const res = await fetch(`/api/cheques?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création chèque");
            }
            return res.json();
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["cheques"] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
        },
    });

    return { encaisserCheque, createCheque };
}
