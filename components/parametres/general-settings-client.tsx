"use client";

import {
    AlertesSection,
    ApiKeysSection,
    ApiSecurityNotice,
} from "@/components/parametres/general-settings-sections";
import {
    buildAlerteStockPayload,
    buildEcheancePayload,
    needsEcheanceUpdate,
    parseAlerteEcheance,
} from "@/components/parametres/general-settings-mapping";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiKeyStatus, useAppSettings, useUpdateAppSettings, type AppSettings } from "@/hooks/use-settings";
import { notify } from "@/lib/notify";

export function GeneralSettingsClient() {
    const { data, isLoading } = useAppSettings();
    const { data: keyStatus } = useApiKeyStatus();

    const updateMutation = useUpdateAppSettings();

    const settings = data?.settings;

    const onSaved = () => notify.success({ title: "Paramètres de l'application enregistrés" });
    const onSaveFailed = (err: unknown) =>
        notify.error({
            title: "Enregistrement des paramètres impossible",
            error: err,
            context: "lors de l'enregistrement des paramètres de l'application",
        });

    const mutate = (payload: AppSettings) =>
        updateMutation.mutate(payload, { onSuccess: onSaved, onError: onSaveFailed });

    const onToggleStockActif = (checked: boolean) =>
        mutate(buildAlerteStockPayload(settings, checked));

    const onEcheanceBlur = (rawValue: string) => {
        const value = parseAlerteEcheance(rawValue);
        if (needsEcheanceUpdate(value, settings?.alerteEcheanceJours)) {
            mutate(buildEcheancePayload(settings, value));
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-2xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Paramètres généraux</h1>
                <p className="text-xs text-muted-foreground">
                    Configuration globale de l&apos;application
                </p>
            </div>

            <AlertesSection
                settings={settings}
                onToggleStockActif={onToggleStockActif}
                onEcheanceBlur={onEcheanceBlur}
            />

            <ApiSecurityNotice />

            <ApiKeysSection
                settings={settings}
                keyStatus={keyStatus}
                isSaving={updateMutation.isPending}
                onSave={mutate}
            />
        </div>
    );
}
