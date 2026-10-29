import type { AppSettings } from "@/hooks/use-settings";

export function buildAlerteStockPayload(
    settings: AppSettings | undefined,
    alerteStockActif: boolean,
): AppSettings {
    return {
        alerteStockActif,
        alerteEcheanceJours: settings?.alerteEcheanceJours ?? 7,
        openaiApiKey: settings?.openaiApiKey ?? "",
        geminiApiKey: settings?.geminiApiKey ?? "",
        mistralApiKey: settings?.mistralApiKey ?? "",
    } as AppSettings;
}

export function buildEcheancePayload(
    settings: AppSettings | undefined,
    alerteEcheanceJours: number,
): AppSettings {
    return {
        alerteStockActif: settings?.alerteStockActif ?? true,
        alerteEcheanceJours,
        openaiApiKey: settings?.openaiApiKey ?? "",
        geminiApiKey: settings?.geminiApiKey ?? "",
        mistralApiKey: settings?.mistralApiKey ?? "",
        openrouterApiKey: settings?.openrouterApiKey ?? "",
    };
}

export function parseAlerteEcheance(rawValue: string): number {
    return Number.parseInt(rawValue, 10);
}

export function needsEcheanceUpdate(value: number, current: number | undefined): boolean {
    return value !== current;
}
