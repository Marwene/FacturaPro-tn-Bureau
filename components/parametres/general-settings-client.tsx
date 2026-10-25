"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { notify } from "@/lib/notify";
import {
    useApiKeyStatus,
    useAppSettings,
    useUpdateAppSettings,
    type AppSettings,
} from "@/hooks/use-settings";
import { Save, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";

export function GeneralSettingsClient() {
    const [showOpenAI, setShowOpenAI] = useState(false);
    const [showGemini, setShowGemini] = useState(false);
    const [showMistral, setShowMistral] = useState(false);
    const [showOpenRouter, setShowOpenRouter] = useState(false);

    const { data, isLoading } = useAppSettings();
    const { data: keyStatus } = useApiKeyStatus();

    const { register, handleSubmit } = useForm<AppSettings>();

    const updateMutation = useUpdateAppSettings();

    const onSaved = () => notify.success({ title: "Paramètres de l'application enregistrés" });
    const onSaveFailed = (err: unknown) =>
        notify.error({
            title: "Enregistrement des paramètres impossible",
            error: err,
            context: "lors de l'enregistrement des paramètres de l'application",
        });

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    const settings = data?.settings;

    return (
        <div className="p-4 max-w-2xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Paramètres généraux</h1>
                <p className="text-xs text-muted-foreground">
                    Configuration globale de l&apos;application
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Alertes</CardTitle>
                    <CardDescription>Configurer les seuils et notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Alerte stock critique</p>
                            <p className="text-xs text-muted-foreground">
                                Alerter quand le stock est en dessous du minimum
                            </p>
                        </div>
                        <Switch
                            checked={settings?.alerteStockActif ?? true}
                            onCheckedChange={(checked) =>
                                updateMutation.mutate(
                                    {
                                        alerteStockActif: checked,
                                        alerteEcheanceJours: settings?.alerteEcheanceJours ?? 7,
                                        openaiApiKey: settings?.openaiApiKey ?? "",
                                        geminiApiKey: settings?.geminiApiKey ?? "",
                                        mistralApiKey: settings?.mistralApiKey ?? "",
                                    } as AppSettings,
                                    { onSuccess: onSaved, onError: onSaveFailed },
                                )
                            }
                        />
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Alerter avant l&apos;échéance (jours)
                        </Label>
                        <Input
                            type="number"
                            min="1"
                            max="90"
                            defaultValue={settings?.alerteEcheanceJours ?? 7}
                            className="h-9 text-sm w-32"
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (val !== settings?.alerteEcheanceJours) {
                                    updateMutation.mutate(
                                        {
                                            alerteStockActif: settings?.alerteStockActif ?? true,
                                            alerteEcheanceJours: val,
                                            openaiApiKey: settings?.openaiApiKey ?? "",
                                            geminiApiKey: settings?.geminiApiKey ?? "",
                                            mistralApiKey: settings?.mistralApiKey ?? "",
                                            openrouterApiKey: settings?.openrouterApiKey ?? "",
                                        } as AppSettings,
                                        { onSuccess: onSaved, onError: onSaveFailed },
                                    );
                                }
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 dark:text-blue-400" />
                <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Sécurité des clés API
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Pour une meilleure sécurité, configurez vos clés API via les variables
                        d&apos;environnement serveur plutôt que dans la base de données. Ajoutez ces
                        variables dans votre fichier .env :
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-mono space-y-0.5">
                        <li>OPENAI_API_KEY=sk-...</li>
                        <li>GEMINI_API_KEY=...</li>
                        <li>MISTRAL_API_KEY=...</li>
                        <li>OPENROUTER_API_KEY=...</li>
                    </ul>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Intelligence Artificielle (IA)</CardTitle>
                    <CardDescription>
                        Clés API pour l&apos;extraction automatique des factures fournisseurs
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">OpenAI API Key</Label>
                            {keyStatus?.status?.openai?.configured && (
                                <Badge variant={keyStatus.status.openai.source === "env" ? "default" : "secondary"}>
                                    {keyStatus.status.openai.source === "env" ? "✓ Env" : "⚠ DB"}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showOpenAI ? "text" : "password"}
                                    placeholder="sk-..."
                                    defaultValue={settings?.openaiApiKey ?? ""}
                                    className="h-9 text-sm pr-10"
                                    disabled={keyStatus?.status?.openai?.source === "env"}
                                    {...register("openaiApiKey")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOpenAI(!showOpenAI)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Utilisée en priorité pour l&apos;extraction des factures
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Gemini API Key</Label>
                            {keyStatus?.status?.gemini?.configured && (
                                <Badge variant={keyStatus.status.gemini.source === "env" ? "default" : "secondary"}>
                                    {keyStatus.status.gemini.source === "env" ? "✓ Env" : "⚠ DB"}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showGemini ? "text" : "password"}
                                    placeholder="AIza..."
                                    defaultValue={settings?.geminiApiKey ?? ""}
                                    className="h-9 text-sm pr-10"
                                    disabled={keyStatus?.status?.gemini?.source === "env"}
                                    {...register("geminiApiKey")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGemini(!showGemini)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Utilisée en fallback si OpenAI échoue
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Mistral AI API Key</Label>
                            {keyStatus?.status?.mistral?.configured && (
                                <Badge variant={keyStatus.status.mistral.source === "env" ? "default" : "secondary"}>
                                    {keyStatus.status.mistral.source === "env" ? "✓ Env" : "⚠ DB"}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showMistral ? "text" : "password"}
                                    placeholder="Votre clé Mistral"
                                    defaultValue={settings?.mistralApiKey ?? ""}
                                    className="h-9 text-sm pr-10"
                                    disabled={keyStatus?.status?.mistral?.source === "env"}
                                    {...register("mistralApiKey")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowMistral(!showMistral)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showMistral ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Utiliser en Fallback gratuit (pixtral) — idéal pour le développement
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">OpenRouter API Key</Label>
                            {keyStatus?.status?.openrouter?.configured && (
                                <Badge variant={keyStatus.status.openrouter.source === "env" ? "default" : "secondary"}>
                                    {keyStatus.status.openrouter.source === "env" ? "✓ Env" : "⚠ DB"}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showOpenRouter ? "text" : "password"}
                                    placeholder="Votre clé OpenRouter"
                                    defaultValue={settings?.openrouterApiKey ?? ""}
                                    className="h-9 text-sm pr-10"
                                    disabled={keyStatus?.status?.openrouter?.source === "env"}
                                    {...register("openrouterApiKey")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOpenRouter(!showOpenRouter)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showOpenRouter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Utilisée en fallback si OpenAI échoue
                        </p>
                    </div>

                    <Button
                        size="sm"
                        className="gap-1.5 text-xs mt-2"
                        onClick={handleSubmit((values) =>
                            updateMutation.mutate(values, { onSuccess: onSaved, onError: onSaveFailed }),
                        )}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        Enregistrer les clés API
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
