"use client";

import type { SerializedBonCommande } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";

interface Client {
    raisonSociale: string;
    matriculeFiscal?: string | null;
    adresse?: string | null;
    ville?: string | null;
    telephone?: string | null;
    email?: string | null;
}

interface BCDetailSidebarProps {
    bc: SerializedBonCommande;
    client?: Client;
}

export function BCDetailSidebar({ bc, client }: BCDetailSidebarProps) {
    const remise = Number(bc.baseHT) - Number(bc.totalHT);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                    <p className="font-semibold">{client?.raisonSociale ?? "—"}</p>
                    {client?.matriculeFiscal && (
                        <p className="text-xs text-muted-foreground font-mono">
                            MF: {client.matriculeFiscal}
                        </p>
                    )}
                    {client?.adresse && <p className="text-xs text-muted-foreground">{client.adresse}</p>}
                    {client?.ville && <p className="text-xs text-muted-foreground">{client.ville}</p>}
                    {client?.telephone && <p className="text-xs text-muted-foreground">{client.telephone}</p>}
                    {client?.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Date de création</span>
                        <span className="text-xs font-medium">{formatDate(bc.dateCreation)}</span>
                    </div>
                    {bc.dateExpiration && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Date d&apos;expiration</span>
                            <span className="text-xs font-medium">{formatDate(bc.dateExpiration)}</span>
                        </div>
                    )}
                    {bc.referenceClient && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Référence client</span>
                            <span className="text-xs font-medium">{bc.referenceClient}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Total HT (base)</span>
                        <span className="text-xs font-medium">{formatCurrency(bc.baseHT)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Remise</span>
                        <span className="text-xs font-medium">{formatCurrency(remise.toFixed(3))}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">TVA</span>
                        <span className="text-xs font-medium">{formatCurrency(bc.totalTVA)}</span>
                    </div>
                    {Number(bc.totalFodec) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">FODEC</span>
                            <span className="text-xs font-medium">{formatCurrency(bc.totalFodec)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                        <span className="text-xs font-semibold">Total TTC</span>
                        <span className="text-sm font-bold">{formatCurrency(bc.totalTTC)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
