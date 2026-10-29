"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { ApiKeyStatusResponse, ApiProvider, AppSettings } from "@/hooks/use-settings";
import { Eye, EyeOff, Loader2, Save, Shield } from "lucide-react";
import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";

type AlertesSectionProps = {
    settings: AppSettings | undefined;
    onToggleStockActif: (checked: boolean) => void;
    onEcheanceBlur: (rawValue: string) => void;
};

export function AlertesSection({
    settings,
    onToggleStockActif,
    onEcheanceBlur,
}: AlertesSectionProps) {
    return (
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
                    <Switch checked={settings?.alerteStockActif ?? true} onCheckedChange={onToggleStockActif} />
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
                        onBlur={(e) => onEcheanceBlur(e.target.value)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export function ApiSecurityNotice() {
    return (
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
    );
}

type ApiKeyField = {
    field: "openaiApiKey" | "geminiApiKey" | "mistralApiKey" | "openrouterApiKey";
    provider: ApiProvider;
    label: string;
    placeholder: string;
    help: string;
};

const API_KEY_FIELDS: ApiKeyField[] = [
    {
        field: "openaiApiKey",
        provider: "openai",
        label: "OpenAI API Key",
        placeholder: "sk-...",
        help: "Utilisée en priorité pour l'extraction des factures",
    },
    {
        field: "geminiApiKey",
        provider: "gemini",
        label: "Gemini API Key",
        placeholder: "AIza...",
        help: "Utilisée en fallback si OpenAI échoue",
    },
    {
        field: "mistralApiKey",
        provider: "mistral",
        label: "Mistral AI API Key",
        placeholder: "Votre clé Mistral",
        help: "Utiliser en Fallback gratuit (pixtral) — idéal pour le développement",
    },
    {
        field: "openrouterApiKey",
        provider: "openrouter",
        label: "OpenRouter API Key",
        placeholder: "Votre clé OpenRouter",
        help: "Utilisée en fallback si OpenAI échoue",
    },
];

type ApiKeysSectionProps = {
    settings: AppSettings | undefined;
    keyStatus: ApiKeyStatusResponse | undefined;
    isSaving: boolean;
    onSave: (values: AppSettings) => void;
};

export function ApiKeysSection({ settings, keyStatus, isSaving, onSave }: ApiKeysSectionProps) {
    const [visibleKeys, setVisibleKeys] = useState<Record<ApiProvider, boolean>>({
        openai: false,
        gemini: false,
        mistral: false,
        openrouter: false,
    });

    const { register, handleSubmit } = useForm<AppSettings>();

    const toggleKeyVisibility = (provider: ApiProvider) =>
        setVisibleKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Intelligence Artificielle (IA)</CardTitle>
                <CardDescription>
                    Clés API pour l&apos;extraction automatique des factures fournisseurs
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {API_KEY_FIELDS.map((key, index) => {
                    const status = keyStatus?.status?.[key.provider];
                    return (
                        <Fragment key={key.field}>
                            {index > 0 && <Separator />}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">{key.label}</Label>
                                    {status?.configured && (
                                        <Badge variant={status.source === "env" ? "default" : "secondary"}>
                                            {status.source === "env" ? "✓ Env" : "⚠ DB"}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={visibleKeys[key.provider] ? "text" : "password"}
                                            placeholder={key.placeholder}
                                            defaultValue={settings?.[key.field] ?? ""}
                                            className="h-9 text-sm pr-10"
                                            disabled={status?.source === "env"}
                                            {...register(key.field)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleKeyVisibility(key.provider)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {visibleKeys[key.provider] ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{key.help}</p>
                            </div>
                        </Fragment>
                    );
                })}

                <Button
                    size="sm"
                    className="gap-1.5 text-xs mt-2"
                    onClick={handleSubmit((values) => onSave(values))}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Save className="h-3.5 w-3.5" />
                    )}
                    Enregistrer les clés API
                </Button>
            </CardContent>
        </Card>
    );
}
