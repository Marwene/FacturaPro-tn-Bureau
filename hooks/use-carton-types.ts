"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId, companyParam } from "./use-queries-shared";

export function useCartonTypes() {
    const companyId = useCompanyId();
    return useQuery({
        queryKey: ["carton-types", companyId] as const,
        queryFn: async () => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/carton-types?${params}`);
            if (!res.ok) throw new Error("Erreur chargement types de cartons");
            return res.json() as Promise<{ cartonTypes: CartonType[] }>;
        },
        placeholderData: (prev) => prev,
    });
}

export function useCreateCartonType() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (data: { nom: string; capacite: number; longueur?: number | null; largeur?: number | null; hauteur?: number | null }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/carton-types?${params}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur création type de carton");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["carton-types"] });
        },
    });
}

export function useUpdateCartonType() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; nom?: string; capacite?: number; longueur?: number | null; largeur?: number | null; hauteur?: number | null }) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/carton-types/${id}?${params}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur modification type de carton");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["carton-types"] });
        },
    });
}

export function useDeleteCartonType() {
    const qc = useQueryClient();
    const companyId = useCompanyId();
    return useMutation({
        mutationFn: async (id: string) => {
            const params = companyParam(companyId);
            const res = await fetch(`/api/carton-types/${id}?${params}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur suppression type de carton");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["carton-types"] });
        },
    });
}

export interface CartonType {
    id: string;
    nom: string;
    capacite: number;
    longueur?: number | null;
    largeur?: number | null;
    hauteur?: number | null;
}