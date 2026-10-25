"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Mail, RefreshCw } from "lucide-react";
import { useClientBlocageMutations } from "@/hooks/use-clients";
import { notify } from "@/lib/notify";
import type { TiersBlocageInfo } from "@/lib/types";

export function ClientBlocageBanner({
    clientId,
    blocage,
    clientEmail,
}: {
    clientId: string;
    blocage: TiersBlocageInfo;
    clientEmail: string | null;
}) {
    const { checkBlocage, envoyerRappel } = useClientBlocageMutations(clientId);

    if (!blocage.estBloque) return null;

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900/50">
                    <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                            Client bloqué
                        </p>
                        <span className="text-xs text-red-600 dark:text-red-400 font-mono">
                            Utilisation : {blocage.tauxUtilisation.toFixed(0)}%
                        </span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        Solde impayé de {parseFloat(blocage.soldeImpaye).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                        {parseFloat(blocage.creditLimit) > 0
                            ? ` — dépasse le plafond de ${parseFloat(blocage.creditLimit).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT`
                            : ""}
                        . Ce client ne peut plus passer de commandes.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400"
                            onClick={() =>
                                checkBlocage.mutate(undefined, {
                                    onSuccess: (res) => {
                                        if (res.estBloque) notify.warning({ title: "Client toujours bloqué", description: res.message });
                                        else notify.success({ title: "Blocage levé", description: res.message });
                                    },
                                    onError: (err) => notify.error({ title: "Vérification impossible", error: err, context: "vérification du blocage client" }),
                                })
                            }
                            disabled={checkBlocage.isPending}
                        >
                            <RefreshCw className="h-3 w-3" />
                            Vérifier
                        </Button>
                        {clientEmail && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                    envoyerRappel.mutate(undefined, {
                                        onSuccess: (res) => notify.success({ title: "Rappel envoyé", description: res.message }),
                                        onError: (err) => notify.error({ title: "Envoi du rappel impossible", error: err, context: "envoi du rappel de blocage" }),
                                    })
                                }
                                disabled={envoyerRappel.isPending}
                            >
                                <Mail className="h-3 w-3" />
                                {envoyerRappel.isPending ? "Envoi..." : "Envoyer rappel"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
