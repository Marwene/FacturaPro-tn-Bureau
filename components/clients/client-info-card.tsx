"use client";

import { formatDate } from "@/lib/utils";
import { formatTND } from "@/lib/decimal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Building2, Hash, CreditCard, FileText, Calendar, Clock, Globe, Banknote, FileSpreadsheet, Shield, AlertCircle } from "lucide-react";
import type { SerializedTiers, TiersBlocageInfo } from "@/lib/types";

interface ClientInfoCardProps {
    client: SerializedTiers;
    blocage?: TiersBlocageInfo;
}

export function ClientInfoCard({ client, blocage }: ClientInfoCardProps) {
    const getStatusVariant = (actif: boolean) => {
        return actif ? "default" : "destructive";
    };

    const getTVAStatusVariant = () => {
        if (client.exonereTVA) return "secondary";
        if (client.assujettTVA) return "default";
        return "outline";
    };

    const getTVAStatusLabel = () => {
        if (client.exonereTVA) return "Exonéré TVA";
        if (client.assujettTVA) return "Assujetti TVA";
        return "Non assujetti";
    };

    return (
        <Card className="relative overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full border bg-muted/30 p-2.5">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                {client.raisonSociale}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getStatusVariant(client.actif)} className="text-xs">
                                    {client.actif ? "Actif" : "Inactif"}
                                </Badge>
                                <Badge variant={getTVAStatusVariant()} className="text-xs">
                                    {getTVAStatusLabel()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Client ID</p>
                        <p className="text-sm font-mono">#{client.id.slice(0, 8)}</p>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Informations de base
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-mono">{client.code}</span>
                            </div>
                            {client.matriculeFiscal && (
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm font-mono">{client.matriculeFiscal}</span>
                                </div>
                            )}
                            {client.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm">{client.email}</span>
                                </div>
                            )}
                            {client.telephone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm">{client.telephone}</span>
                                </div>
                            )}
                            {client.siteWeb && (
                                <div className="flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                    <a href={client.siteWeb} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                        Site web
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Adresse
                        </h4>
                        <div className="space-y-2">
                            {client.adresse && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                    <span className="text-sm">{client.adresse}</span>
                                </div>
                            )}
                            {(client.ville || client.codePostal) && (
                                <div className="flex items-center gap-2 ml-5.5">
                                    <span className="text-sm">
                                        {client.ville}{client.ville && client.codePostal ? ", " : ""}
                                        {client.codePostal}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Paramètres fiscaux
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Taux retenue:</span>
                                <span className="text-sm font-medium">{client.tauxRetenue}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Limite crédit:</span>
                                <span className="text-sm font-medium">{formatTND(client.creditLimit)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Devise
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Principale:</span>
                                <span className="text-sm font-medium">{client.devise}</span>
                            </div>
                            {client.deviseSecondaire && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Secondaire:</span>
                                    <span className="text-sm font-medium">{client.deviseSecondaire}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Dates
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Créé:</span>
                                <span className="text-sm">{formatDate(client.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Mis à jour:</span>
                                <span className="text-sm">{formatDate(client.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {blocage?.estBloque && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-800 dark:text-red-300">
                                Client bloqué - Utilisation: {blocage.tauxUtilisation.toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                            Solde impayé: {parseFloat(blocage.soldeImpaye).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                            {parseFloat(blocage.creditLimit) > 0
                                ? ` — dépasse le plafond de ${parseFloat(blocage.creditLimit).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT`
                                : ""}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}