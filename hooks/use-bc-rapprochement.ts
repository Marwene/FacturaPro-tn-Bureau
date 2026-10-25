"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { queryKeys } from "@/hooks/use-bc";
import type { SerializedBonCommandeLine } from "@/lib/types";
import type { SaveDetailInput, UpdateDetailRowInput, UpdateBCLineInput, OrdreFabricationInput } from "@/lib/schemas/bon-commande";

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

export interface ExtractedDetailLine {
    id: string;
    bonCommandeLineId: string | null;
    codeArticle: string | null;
    description: string;
    taille: string | null;
    couleur: string | null;
    broderie: string | null;
    impressionDtf: string | null;
    quantite: string;
}

export interface DetailLigneDisponible {
    id: string;
    description: string;
    quantite: string;
    codeProduit: string | null;
}

export const rapprochementQueryKeys = {
    detail: (bcId: string, companyId?: string | null) => ["bons-commande", bcId, "rapprochement", companyId] as const,
};

export function useBCRapprochement(bcId: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: rapprochementQueryKeys.detail(bcId, companyId),
        queryFn: async () => {
            const res = await fetch(`/api/bons-commande/${bcId}/detail`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur chargement du rapprochement");
            }
            return res.json() as Promise<{
                bonCommande: { id: string; numero: string };
                lignes: SerializedBonCommandeLine[];
            }>;
        },
        enabled: !!bcId,
    });
}

export function useBCRapprochementMutations(bcId: string) {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    const key = rapprochementQueryKeys.detail(bcId, companyId);

    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: key });
        qc.invalidateQueries({ queryKey: queryKeys.bc(bcId, companyId) });
    };

    const extractDetail = useMutation({
        mutationFn: async (formData: FormData) => {
            const { extractBonCommandeDetailFromScan } = await import("@/app/actions/bons-commande");
            return extractBonCommandeDetailFromScan(bcId, formData) as Promise<{
                extracted: {
                    lines: ExtractedDetailLine[];
                    lignesDisponibles: DetailLigneDisponible[];
                    nonRapprochees: number;
                };
            }>;
        },
    });

    const saveDetail = useMutation({
        mutationFn: async (data: SaveDetailInput) => {
            const { saveBonCommandeDetail } = await import("@/app/actions/bons-commande");
            return saveBonCommandeDetail(bcId, data);
        },
        onSettled: invalidateAll,
    });

    const deleteDetailRow = useMutation({
        mutationFn: async (detailId: string) => {
            const params = companyId ? `?companyId=${companyId}` : "";
            const res = await fetch(`/api/bons-commande/${bcId}/detail/${detailId}${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression");
            }
            return res.json();
        },
        onSettled: invalidateAll,
    });

    const updateDetailRow = useMutation({
        mutationFn: async ({ detailId, data }: { detailId: string; data: UpdateDetailRowInput }) => {
            const params = companyId ? `?companyId=${companyId}` : "";
            const res = await fetch(`/api/bons-commande/${bcId}/detail/${detailId}${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification");
            }
            return res.json();
        },
        onSettled: invalidateAll,
    });

    const updateLine = useMutation({
        mutationFn: async ({ lineId, data }: { lineId: string; data: UpdateBCLineInput }) => {
            const params = companyId ? `?companyId=${companyId}` : "";
            const res = await fetch(`/api/bons-commande/${bcId}/lines/${lineId}${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification");
            }
            return res.json();
        },
        onSettled: invalidateAll,
    });

    const launchOF = useMutation({
        mutationFn: async (data: OrdreFabricationInput) => {
            const params = companyId ? `?companyId=${companyId}` : "";
            const res = await fetch(`/api/ordres-fabrication${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création OF");
            }
            return res.json();
        },
        onSettled: () => {
            invalidateAll();
            qc.invalidateQueries({ queryKey: ["ordres-fabrication"] });
        },
    });

    return { extractDetail, saveDetail, deleteDetailRow, updateDetailRow, updateLine, launchOF };
}
