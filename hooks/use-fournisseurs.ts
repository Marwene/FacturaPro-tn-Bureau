"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFournisseursStore } from "@/lib/stores/fournisseurs-store";
import { useDeferredValue } from "react";

import type { SerializedTiers } from "@/lib/types";
import type { FournisseurInput } from "@/lib/schemas/fournisseur";

interface FournisseursResponse {
    fournisseurs: SerializedTiers[];
    stats: { total: number; actifs: number; inactifs: number; avecContact: number };
}

interface FournisseurDetailResponse {
    fournisseur: SerializedTiers;
    stats: {
        totalAchatsTTC: string;
        totalPaye: string;
        totalImpaye: string;
        totalAvoirsTTC: string;
        nbAchats: number;
        nbAchatsImpayes: number;
        nbAvoirs: number;
    };
}

interface FournisseurAchatSummary {
    id: string;
    numero: string | null;
    dateFacture?: string | null;
    totalTTC: string;
    status: string;
}

interface FournisseurAvoirSummary {
    id: string;
    numero: string | null;
    dateEmission?: string | null;
    totalTTC: string;
    status: string;
    motif: string | null;
}

interface FournisseurDocumentsResponse {
    achats: FournisseurAchatSummary[];
    avoirs: FournisseurAvoirSummary[];
}

export interface FournisseurSoldeEntry {
    id: string;
    date: string;
    piece: string;
    mouvement: string;
    commentaire: string;
    debit: string;
    credit: string;
    solde: string;
}

interface FournisseurSoldeResponse {
    entries: FournisseurSoldeEntry[];
    totalDebit: string;
    totalCredit: string;
    soldeFinal: string;
}

export interface FournisseurEcheanceItem {
    id: string;
    numero: string | null;
    dateEcheance?: string | null;
    totalTTC: string;
    status: string;
    daysUntilDue: number;
}

interface FournisseurEcheancesResponse {
    overdue: FournisseurEcheanceItem[];
    upcoming: FournisseurEcheanceItem[];
    later: FournisseurEcheanceItem[];
    totalOverdue: number;
    totalUpcoming: number;
}

export function useFournisseursList() {
    const searchInput = useFournisseursStore((s) => s.searchInput);
    const deferredSearch = useDeferredValue(searchInput);
    return useQuery({
        queryKey: ["fournisseurs", deferredSearch] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            const res = await fetch(`/api/fournisseurs?${params}`);
            if (!res.ok) throw new Error("Erreur chargement fournisseurs");
            return res.json() as Promise<FournisseursResponse>;
        },
        placeholderData: (prev) => prev,
    });
}

export function useFournisseursMutations() {
    const qc = useQueryClient();

    const createFournisseur = useMutation({
        mutationFn: async (data: FournisseurInput) => {
            const res = await fetch("/api/fournisseurs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création fournisseur");
            }
            return res.json();
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: ["fournisseurs"] });
            const previous = qc.getQueryData<FournisseursResponse>(["fournisseurs"]);
            if (previous) {
                const now = new Date();
                const optimisticFournisseur: SerializedTiers = {
                    id: `temp-${Date.now()}`,
                    code: "...",
                    raisonSociale: data.raisonSociale,
                    matriculeFiscal: data.matriculeFiscal ?? null,
                    adresse: data.adresse ?? null,
                    ville: data.ville ?? null,
                    codePostal: data.codePostal ?? null,
                    telephone: data.telephone ?? null,
                    email: data.email ?? null,
                    siteWeb: data.siteWeb ?? null,
                    assujettTVA: false,
                    exonereTVA: false,
                    tauxRetenue: "0",
                    creditLimit: "0",
                    ribBancaire: null,
                    banque: null,
                    notes: data.notes ?? null,
                    actif: data.actif,
                    devise: "TND",
                    deviseSecondaire: null,
                    dateBlocage: null,
                    emailSentAt: null,
                    createdAt: now,
                    updatedAt: now,
                    isClient: data.isClient,
                    isFournisseur: true,
                    contactNom: data.contactNom ?? null,
                    contactTel: null,
                    contactFonction: data.contactFonction ?? null,
                };
                qc.setQueryData<FournisseursResponse>(["fournisseurs"], {
                    ...previous,
                    fournisseurs: [optimisticFournisseur, ...previous.fournisseurs],
                    stats: {
                        ...previous.stats,
                        total: previous.stats.total + 1,
                        actifs: previous.stats.actifs + 1,
                    },
                });
            }
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) qc.setQueryData(["fournisseurs"], context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["fournisseurs"] });
        },
    });

    const updateFournisseur = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & FournisseurInput) => {
            const res = await fetch(`/api/fournisseurs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur mise à jour fournisseur");
            }
            return res.json();
        },
        onMutate: async (variables) => {
            const { id, ...data } = variables as { id: string } & Record<string, unknown>;
            await qc.cancelQueries({ queryKey: ["fournisseurs"] });
            const previous = qc.getQueryData<FournisseursResponse>(["fournisseurs"]);
            if (previous) {
                qc.setQueryData<FournisseursResponse>(["fournisseurs"], {
                    ...previous,
                    fournisseurs: previous.fournisseurs.map((f) =>
                        f.id === id ? { ...f, ...data } : f
                    ),
                });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                qc.setQueryData(["fournisseurs"], context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["fournisseurs"] });
        },
    });

    const deleteFournisseur = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/fournisseurs/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression fournisseur");
            }
        },
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["fournisseurs"] });
            const previous = qc.getQueryData<FournisseursResponse>(["fournisseurs"]);
            if (previous) {
                qc.setQueryData<FournisseursResponse>(["fournisseurs"], {
                    ...previous,
                    fournisseurs: previous.fournisseurs.filter((f) => f.id !== id),
                });
            }
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                qc.setQueryData(["fournisseurs"], context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["fournisseurs"] });
        },
    });

    return { createFournisseur, updateFournisseur, deleteFournisseur };
}

export const fournisseurDetailKeys = {
    detail: (id: string) => ["fournisseur-detail", id] as const,
    documents: (id: string) => ["fournisseur-documents", id] as const,
    solde: (id: string, from?: string, to?: string) => ["fournisseur-solde", id, from, to] as const,
    echeances: (id: string) => ["fournisseur-echeances", id] as const,
};

export function useFournisseurDetail(id: string) {
    return useQuery({
        queryKey: fournisseurDetailKeys.detail(id),
        queryFn: async () => {
            const res = await fetch(`/api/fournisseurs/${id}/detail`);
            if (!res.ok) throw new Error("Erreur chargement détail fournisseur");
            return res.json() as Promise<FournisseurDetailResponse>;
        },
        enabled: !!id,
    });
}

export function useFournisseurDocuments(id: string) {
    return useQuery({
        queryKey: fournisseurDetailKeys.documents(id),
        queryFn: async () => {
            const res = await fetch(`/api/fournisseurs/${id}/documents`);
            if (!res.ok) throw new Error("Erreur chargement documents fournisseur");
            return res.json() as Promise<FournisseurDocumentsResponse>;
        },
        enabled: !!id,
    });
}

export function useFournisseurSolde(id: string, from?: string, to?: string) {
    return useQuery({
        queryKey: fournisseurDetailKeys.solde(id, from, to),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const qs = params.toString();
            const res = await fetch(`/api/fournisseurs/${id}/solde${qs ? `?${qs}` : ""}`);
            if (!res.ok) throw new Error("Erreur chargement solde fournisseur");
            return res.json() as Promise<FournisseurSoldeResponse>;
        },
        enabled: !!id,
    });
}

export function useFournisseurEcheances(id: string) {
    return useQuery({
        queryKey: fournisseurDetailKeys.echeances(id),
        queryFn: async () => {
            const res = await fetch(`/api/fournisseurs/${id}/echeances`);
            if (!res.ok) throw new Error("Erreur chargement échéances fournisseur");
            return res.json() as Promise<FournisseurEcheancesResponse>;
        },
        enabled: !!id,
    });
}
