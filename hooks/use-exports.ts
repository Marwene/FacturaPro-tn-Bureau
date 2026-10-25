"use client";

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useExportListStore } from "@/lib/stores/export-store";
import type {
    SerializedExport,
    SerializedNgpCode,
} from "@/lib/types";
import { useDeferredValue } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

function companyParam(id: string | null): string {
    return id ? `companyId=${id}` : "";
}

export const queryKeys = {
    exports: (search?: string, status?: string, companyId?: string | null) =>
        ["exports", search, status, companyId] as const,
    exportById: (id: string, companyId?: string | null) => ["exports", id, companyId] as const,
    blsWithVise: (tiersId: string, companyId?: string | null) => ["bls", "vise", tiersId, companyId] as const,
    ngpCodes: (companyId?: string | null) => ["ngp-codes", companyId] as const,
    dashboard: (companyId?: string | null) => ["dashboard", companyId] as const,
};

// ─── useBLsWithVise ───────────────────────────────────────────────────────────

interface BLWithViséResponse {
    id: string;
    numero: string;
    dateCreation: string;
    snNumero: string | null;
    lines: Array<{ id: string; description: string; quantite: string }>;
    invoice?: {
        id: string;
        numero: string;
        dateEmission: string;
    } | null;
}

export function useBLsWithVise(tiersId: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.blsWithVise(tiersId, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("tiersId", tiersId);
            params.set("blViseActif", "true");
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/bons-livraison?${params}`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.deliveryNotes ?? data.data ?? []).filter(
                (b: BLWithViséResponse) => b.snNumero
            ) as BLWithViséResponse[];
        },
        enabled: !!tiersId,
        staleTime: 30_000,
    });
}

// ─── useExportList ────────────────────────────────────────────────────────────

export function useExportList() {
    const companyId = useCompanyId();
    const searchInput = useExportListStore((s) => s.searchInput);
    const statusFilter = useExportListStore((s) => s.statusFilter);
    const deferredSearch = useDeferredValue(searchInput);

    return useQuery({
        queryKey: queryKeys.exports(deferredSearch, statusFilter, companyId),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (deferredSearch) params.set("search", deferredSearch);
            if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/exports?${params}`);
            if (!res.ok) throw new Error("Erreur chargement exports");
            return res.json() as Promise<{
                exports: SerializedExport[];
                stats: { total: number; enCours: number; valide: number; brouillon: number };
            }>;
        },
        placeholderData: (prev) => prev,
    });
}

// ─── useExportDetail ─────────────────────────────────────────────────────────

export function useExportDetail(id: string) {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.exportById(id, companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`);
            if (!res.ok) throw new Error("Erreur chargement export");
            return res.json() as Promise<{ export: SerializedExport }>;
        },
        enabled: !!id,
    });
}

// ─── useNgpCodesForExport ─────────────────────────────────────────────────────

export function useNgpCodesForExport() {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: queryKeys.ngpCodes(companyId),
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/ngp-codes?${params}`);
            if (!res.ok) throw new Error("Erreur chargement NGP");
            return res.json() as Promise<{ codes: SerializedNgpCode[] }>;
        },
        staleTime: 60_000,
    });
}

// ─── useExportMutations (with Optimistic UI) ─────────────────────────────────

export function useExportMutations() {
    const qc = useQueryClient();
    const companyId = useCompanyId();

    const createExport = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création export");
            }
            return res.json();
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const updateExport = useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification export");
            }
            return res.json();
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    const deleteExport = useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/exports/${id}?${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression export");
            }
            return res.json();
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["exports"] });
            qc.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
        },
    });

    return { createExport, updateExport, deleteExport };
}

// ─── useBLSnNumbers ──────────────────────────────────────────────────────────

export function useBLSnNumbers(bonLivraisonIds: string[]) {
    return useQuery({
        queryKey: ["bl-sn-numbers", ...bonLivraisonIds.sort()],
        queryFn: async () => {
            const ids = [...new Set(bonLivraisonIds.filter(Boolean))];
            const results = await Promise.allSettled(
                ids.map((blId) =>
                    fetch(`/api/bons-livraison/${blId}`).then((r) => (r.ok ? r.json() : null))
                )
            );
            const sns: string[] = [];
            for (const res of results) {
                if (res.status === "fulfilled" && res.value?.deliveryNote?.snNumero) {
                    sns.push(res.value.deliveryNote.snNumero);
                }
            }
            return sns;
        },
        enabled: bonLivraisonIds.length > 0,
        staleTime: 60_000,
    });
}
