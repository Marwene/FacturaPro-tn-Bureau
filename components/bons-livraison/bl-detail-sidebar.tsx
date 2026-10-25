"use client";

import type { SerializedDeliveryNote } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import Big from "big.js";

interface BLDetailSidebarProps {
    bl: SerializedDeliveryNote;
    client?: {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
    };
}

export function BLDetailSidebar({ bl, client }: BLDetailSidebarProps) {
    const lines = bl.lines ?? [];

    let totalRemise = new Big(0);
    let totalBaseAvantRemise = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const baseLine = qty.times(prix);
        const rem = new Big(line.remise);
        const remiseAmount = baseLine.times(rem.div(100));
        totalBaseAvantRemise = totalBaseAvantRemise.plus(baseLine);
        totalRemise = totalRemise.plus(remiseAmount);
    }
    const lignesAvecRemise = lines.filter(l => new Big(l.remise).gt(0));
    const tousLesTauxUniques = [...new Set(lignesAvecRemise.map(l => l.remise))];
    const remisePercent = totalRemise.gt(0)
        ? tousLesTauxUniques.length === 1
            ? tousLesTauxUniques[0]
            : totalBaseAvantRemise.gt(0)
                ? `~${totalRemise.div(totalBaseAvantRemise).times(100).toFixed(1)}`
                : "0"
        : "0";

    let totalTVA = new Big(0);
    let totalHTForTVA = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const rem = new Big(line.remise);
        const remFactor = new Big(1).minus(rem.div(100));
        const ht = qty.times(prix).times(remFactor);
        const tva = ht.times(new Big(line.tauxTVA).div(100));
        totalTVA = totalTVA.plus(tva);
        totalHTForTVA = totalHTForTVA.plus(ht);
    }
    const tauxTVAMoyen = totalHTForTVA.gt(0)
        ? totalTVA.div(totalHTForTVA).times(100).toFixed(1)
        : "0";

    const timbreFiscal = new Big("1.000");
    const totalTTCWithTimbre = new Big(bl.totalTTC).plus(timbreFiscal);

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

            {bl.blViseActif && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">BL Visé Sous Douane</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">N° SN</span>
                            <span className="text-xs font-medium">{bl.snNumero ?? "—"}</span>
                        </div>
                        {bl.dateSN && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Date SN</span>
                                <span className="text-xs">{formatDate(bl.dateSN)}</span>
                            </div>
                        )}
                        {bl.poidsBrut && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Poids Brut</span>
                                <span className="text-xs">{bl.poidsBrut} kg</span>
                            </div>
                        )}
                        {bl.poidsNet && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Poids Net</span>
                                <span className="text-xs">{bl.poidsNet} kg</span>
                            </div>
                        )}
                        {bl.nbColis != null && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Colis</span>
                                <span className="text-xs">{bl.nbColis}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Devise</span>
                            <span className="text-xs font-medium">{bl.devise}</span>
                        </div>
                        {bl.tauxChange && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Taux Change</span>
                                <span className="text-xs">{parseFloat(bl.tauxChange || "0").toFixed(4)}</span>
                            </div>
                        )}
                        {bl.montantTND != null && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Mt TND</span>
                                <span className="text-xs font-medium">{formatCurrency(bl.montantTND ?? "0", "TND")}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[
                        { label: "Base HT", value: bl.baseHT },
                        ...(totalRemise.gt(0)
                            ? [{ label: `Remise (${remisePercent}%)`, value: `-${totalRemise.toFixed(3)}`, orange: true }]
                            : []),
                        { label: "Total HT", value: bl.totalHT, bold: true },
                        { label: `TVA (${tauxTVAMoyen}%)`, value: bl.totalTVA },
                        ...(parseFloat(bl.totalFodec) > 0
                            ? [{ label: "FODEC (1%)", value: bl.totalFodec }]
                            : []),
                        { label: "Timbre fiscal", value: timbreFiscal.toFixed(3) },
                        { label: "Total TTC", value: totalTTCWithTimbre.toFixed(3), bold: true },
                    ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center">
                            <span
                                className={`text-xs ${row.bold ? "font-semibold" : row.orange ? "text-orange-600" : "text-muted-foreground"}`}
                            >
                                {row.label}
                            </span>
                            <span className={`text-xs ${row.bold ? "font-bold" : row.orange ? "text-orange-600" : ""}`}>
                                {formatCurrency(row.value, bl.devise)}
                            </span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
