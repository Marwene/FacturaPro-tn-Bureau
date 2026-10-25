"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TresorerieCompte, TresorerieData } from "@/lib/types/tresorerie";

/** Filtre de compte de `GET /api/tresorerie?compte=` (422 si hors valeurs). */
export type CompteFiltreTresorerie = "ALL" | "CAISSE" | "BANQUE";

const TRESORERIE_KEYS = ["tresorerie", "tresorerie-full", "tresorerie-evolution"] as const;

export function useTresorerie(
    days: number,
    compte: CompteFiltreTresorerie = "ALL",
    companyId?: string | null,
) {
    return useQuery<TresorerieData>({
        queryKey: ["tresorerie", days, compte, companyId],
        queryFn: async () => {
            const params = new URLSearchParams({ days: String(days) });
            if (compte !== "ALL") params.set("compte", compte);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/tresorerie?${params}`);
            if (!res.ok) throw new Error("Erreur chargement trésorerie");
            return res.json();
        },
        placeholderData: keepPreviousData,
    });
}

export interface UpdateCompteSoldeInput {
    id: string;
    soldeInitial: string;
    dateSoldeInitial?: string;
}

/** `PATCH /api/tresorerie/comptes/[id]` — permission `paiements:modifier` côté API. */
export function useUpdateCompteSolde() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, soldeInitial, dateSoldeInitial }: UpdateCompteSoldeInput): Promise<TresorerieCompte> => {
            const res = await fetch(`/api/tresorerie/comptes/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dateSoldeInitial ? { soldeInitial, dateSoldeInitial } : { soldeInitial }),
            });
            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? "Erreur mise à jour du solde initial");
            }
            return res.json();
        },
        onSuccess: () => {
            for (const key of TRESORERIE_KEYS) {
                void queryClient.invalidateQueries({ queryKey: [key] });
            }
        },
    });
}
