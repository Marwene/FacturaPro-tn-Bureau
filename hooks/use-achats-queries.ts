"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import { queryKeys as rootQueryKeys } from "@/lib/query-keys";
import type { SerializedAchat, AchatStatus, AchatType, AchatCategorie } from "@/lib/types";
import { useAchatsStore, useAchatFormStore } from "@/lib/stores/achats-store";

interface AchatsResponse {
    achats: SerializedAchat[];
    stats: {
        total: number;
        totalTTC: string;
        validees: number;
        brouillons: number;
    };
    parCategorie: {
        categorie: AchatCategorie | null;
        totalTTC: string;
        count: number;
    }[];
}

export function useAchats(search?: string, status?: string, type?: AchatType) {
    const companyId = useCompanyId();
    return useQuery<AchatsResponse>({
        queryKey: ["achats", search, status, companyId, type ?? "ALL", status] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (status && status !== "ALL") params.set("status", status);
            if (type) params.set("type", type);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/achats?${params}`);
            if (!res.ok) throw new Error("Failed to fetch achats");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });
}

export function useAchat(id: string) {
    const companyId = useCompanyId();
    return useQuery<{ achat: SerializedAchat }>({
        queryKey: ["achats", id, companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`);
            if (!res.ok) throw new Error("Failed to fetch achat");
            return res.json();
        },
        enabled: !!id,
    });
}

export function useCreateAchat() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création achat");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["achats"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}

export function useUpdateAchatStatus() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: AchatStatus;
        }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Erreur mise à jour statut");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["achats"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}

/** Wraps useAchats with Zustand-based search/status filter for backward compat */
export function useAchatsList(typeFilter?: AchatType) {
    const searchQuery = useAchatsStore((s) => s.searchQuery);
    const statusFilter = useAchatsStore((s) => s.statusFilter);
    return useAchats(searchQuery, statusFilter ?? undefined, typeFilter);
}

/**
 * Init du store `type` depuis l'URL de l'écran de scan (ex-inline de
 * `components/achats/scan-upload-screen.tsx`, à l'origine un ex-useEffect) :
 * le queryFn tourne hors cycle de rendu, l'écriture via getState() ne peut
 * donc pas déclencher le warning React 19 « Cannot update a component while
 * rendering… » (react#31730) que provoquerait un write store pendant le render
 * (l'écran de vérification/erreur est encore abonné au premier render).
 * staleTime 0 = re-init à chaque montage, comme l'ex-effet ; retry false =
 * l'ex-.catch silencieux (1 tentative) ; garde d'idempotence = set() Zustand
 * notifierait ses abonnés même sans changement de valeur.
 */
export function useAchatScanTypeInit(type: AchatType) {
    return useQuery({
        queryKey: rootQueryKeys.achats.scanTypeInit(type),
        queryFn: async () => {
            const store = useAchatFormStore.getState();
            if (store.type !== type) store.setType(type);
            return type;
        },
        staleTime: 0,
        retry: false,
    });
}

export function useAchatBls(tiersId?: string) {
    const companyId = useCompanyId();
    return useQuery<{ achats: SerializedAchat[] }>({
        queryKey: ["achats", "bls", tiersId, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("type", "BL");
            if (tiersId) params.set("tiersId", tiersId);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/achats?${params}`);
            if (!res.ok) throw new Error("Failed to fetch BLs");
            return res.json();
        },
        enabled: !!tiersId,
        placeholderData: (prev) => prev,
    });
}

export function useUpdateAchatMeta() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({
            id,
            blAchatId,
            categorieAchat,
        }: {
            id: string;
            blAchatId?: string | null;
            categorieAchat?: AchatCategorie | null;
        }) => {
            const params = companyParam(companyId);
            const body: Record<string, unknown> = {};
            if (blAchatId !== undefined) body.blAchatId = blAchatId;
            if (categorieAchat !== undefined) body.categorieAchat = categorieAchat;
            const res = await fetch(`/api/achats/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Erreur mise à jour achat");
            return res.json();
        },
        onSuccess: (_data, { id }) => {
            qc.invalidateQueries({ queryKey: ["achats"] });
            qc.invalidateQueries({ queryKey: ["achats", id] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}

export function useDeleteAchat() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/achats/${id}?${params}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erreur suppression");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["achats"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}
