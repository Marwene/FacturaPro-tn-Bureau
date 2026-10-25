"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";
import type { SerializedDeliveryNote, DeliveryNoteStatus } from "@/lib/types";

interface DeliveryNotesResponse {
    deliveryNotes: SerializedDeliveryNote[];
    stats: {
        total: number;
        totalTTC: string;
        livres: number;
        brouillons: number;
    };
}

export function useDeliveryNotes(search?: string, status?: string) {
    const companyId = useCompanyId();
    return useQuery<DeliveryNotesResponse>({
        queryKey: ["deliveryNotes", search, status, companyId] as const,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (status && status !== "ALL") params.set("status", status);
            if (companyId) params.set("companyId", companyId);
            const res = await fetch(`/api/bons-livraison?${params}`);
            if (!res.ok) throw new Error("Failed to fetch delivery notes");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });
}

export function useDeliveryNote(id: string) {
    const companyId = useCompanyId();
    return useQuery<{ deliveryNote: SerializedDeliveryNote }>({
        queryKey: ["deliveryNotes", id, companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`);
            if (!res.ok) throw new Error("Failed to fetch delivery note");
            return res.json();
        },
        enabled: !!id,
    });
}

export function useCreateDeliveryNote() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création bon de livraison");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveryNotes"] }),
    });
}

export function useUpdateDeliveryNoteStatus() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: DeliveryNoteStatus;
        }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Erreur mise à jour statut");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
        },
    });
}

export function useDeleteDeliveryNote() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/bons-livraison/${id}?${params}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erreur suppression");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["deliveryNotes"] });
        },
    });
}
