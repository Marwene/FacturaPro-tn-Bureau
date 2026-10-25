"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/api-error";
import type { SerializedSettings } from "@/lib/types";

type SettingsData = { settings: SerializedSettings };

export function useSettingsData() {
    return useQuery({
        queryKey: queryKeys.settings.all(),
        queryFn: async () => {
            const res = await fetch("/api/settings");
            if (!res.ok) throw new Error("Erreur chargement paramètres");
            return res.json() as Promise<SettingsData>;
        },
        placeholderData: (prev) => prev,
    });
}

export function useSettingsMutations() {
    const qc = useQueryClient();

    const updateSettings = useMutation({
        mutationFn: async (data: Record<string, unknown>): Promise<void> => {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const body: unknown = await res.json();
                throw new Error(readApiErrorMessage(body) ?? "Erreur mise à jour paramètres");
            }
            await res.json();
        },
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: queryKeys.settings.all() });
            const previous = qc.getQueryData<SettingsData>(queryKeys.settings.all());
            if (previous) {
                qc.setQueryData<SettingsData>(queryKeys.settings.all(), {
                    settings: { ...previous.settings, ...data },
                });
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                qc.setQueryData(queryKeys.settings.all(), context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.settings.all() });
        },
    });

    return { updateSettings };
}

export function useUnsavedChangesWarning(isDirty: boolean) {
    // Justification useEffect : listener beforeunload — confirmation avant de quitter la page avec des modifications non sauvegardées, événement émis par le navigateur à la fermeture de l'onglet (non réactif : aucun état React ne déclenche beforeunload, seul window.addEventListener peut l'intercepter).
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);
}

export type ApiProvider = "openai" | "gemini" | "mistral" | "openrouter";

export interface ApiKeyStatus {
    configured: boolean;
    source: "env" | "db" | "none";
}

export interface AppSettings {
    alerteStockActif: boolean;
    alerteEcheanceJours: number;
    openaiApiKey: string | null;
    geminiApiKey: string | null;
    mistralApiKey: string | null;
    openrouterApiKey: string | null;
}

export interface AppSettingsResponse {
    settings: AppSettings;
}

export interface ApiKeyStatusResponse {
    status: Record<ApiProvider, ApiKeyStatus>;
}

/** GET /api/settings/app — paramètres globaux de l'application (alertes + clés API). */
export function useAppSettings() {
    return useQuery<AppSettingsResponse>({
        queryKey: queryKeys.settings.app(),
        queryFn: async () => {
            const res = await fetch("/api/settings/app");
            if (!res.ok) throw new Error("Failed");
            return res.json() as Promise<AppSettingsResponse>;
        },
    });
}

/** GET /api/settings/app/status — présence/source des clés API (jamais leur valeur). */
export function useApiKeyStatus() {
    return useQuery<ApiKeyStatusResponse>({
        queryKey: queryKeys.settings.apiKeyStatus(),
        queryFn: async () => {
            const res = await fetch("/api/settings/app/status");
            if (!res.ok) throw new Error("Failed to load key status");
            return res.json() as Promise<ApiKeyStatusResponse>;
        },
    });
}

/** PUT /api/settings/app — invalidation seule, les toasts sont passés par le composant. */
export function useUpdateAppSettings() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (values: AppSettings): Promise<void> => {
            const res = await fetch("/api/settings/app", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error("Failed");
            await res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.settings.app() });
        },
    });
}
