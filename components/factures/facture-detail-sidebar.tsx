"use client";

import type { SerializedInvoice } from "@/lib/types";
import { SectionCard } from "@/components/shared/section-card";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/decimal";
import Big from "big.js";

interface FactureDetailSidebarProps {
    invoice: SerializedInvoice;
    client?: {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
        tauxRetenue: string;
    };
    resteAPayer: Big;
    montantPaye: Big;
}

export function FactureDetailSidebar({
    invoice,
    client,
    resteAPayer,
    montantPaye,
}: FactureDetailSidebarProps) {
    return (
        <div className="space-y-4">
            <SectionCard title="Client" contentClassName="pt-3 space-y-1.5 text-sm">
                <p className="font-semibold">{client?.raisonSociale ?? "—"}</p>
                {client?.matriculeFiscal && (
                    <p className="text-xs text-muted-foreground font-mono">
                        MF: {client.matriculeFiscal}
                    </p>
                )}
                {client?.adresse && (
                    <p className="text-xs text-muted-foreground">{client.adresse}</p>
                )}
                {client?.ville && (
                    <p className="text-xs text-muted-foreground">{client.ville}</p>
                )}
                {client?.telephone && (
                    <p className="text-xs text-muted-foreground">{client.telephone}</p>
                )}
                {client?.email && (
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                )}
                {client?.tauxRetenue && parseFloat(client.tauxRetenue) > 0 && (
                    <Badge variant="outline" className="text-xs mt-1">
                        RS {client.tauxRetenue}%
                    </Badge>
                )}
            </SectionCard>

            {invoice.bcViseActif && (
                <SectionCard title="BC Visé Sous Douane" contentClassName="pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">N° SN</span>
                        <span className="text-xs font-medium">{invoice.bcViseNumero ?? "—"}</span>
                    </div>
                    {invoice.dateSN && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Date SN</span>
                            <DateCell value={invoice.dateSN} className="text-xs" />
                        </div>
                    )}
                    {invoice.poidsBrut && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Poids Brut</span>
                            <span className="text-xs">{invoice.poidsBrut} kg</span>
                        </div>
                    )}
                    {invoice.poids && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Poids Net</span>
                            <span className="text-xs">{invoice.poids} kg</span>
                        </div>
                    )}
                    {invoice.nbColis != null && (
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Colis</span>
                            <span className="text-xs">{invoice.nbColis}</span>
                        </div>
                    )}
                </SectionCard>
            )}

            <SectionCard title="Récapitulatif" contentClassName="pt-3 space-y-2">
                {[
                    { label: "Base HT", value: invoice.baseHT },
                    { label: "Total HT", value: invoice.totalHT },
                    { label: "TVA", value: invoice.totalTVA },
                    ...(parseFloat(invoice.totalFodec) > 0
                        ? [{ label: "FODEC", value: invoice.totalFodec }]
                        : []),
                    { label: "Total TTC", value: invoice.totalTTC, bold: true },
                    ...(parseFloat(invoice.totalRetenue) > 0
                        ? [{ label: "Retenue (−)", value: invoice.totalRetenue, negative: true }]
                        : []),
                ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                        <span
                            className={`text-xs ${row.bold ? "font-semibold" : "text-muted-foreground"
                                }`}
                        >
                            {row.label}
                        </span>
                        <span
                            className={`text-xs ${row.bold
                                ? "font-bold"
                                : row.negative
                                    ? "text-red-500"
                                    : ""
                                }`}
                        >
                            {row.negative ? "−" : ""}
                            {formatCurrency(row.value, invoice.devise)}
                        </span>
                    </div>
                ))}
                {invoice.devise !== "TND" && invoice.montantTND && parseFloat(invoice.montantTND) > 0 && (
                    <>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Devise originale</span>
                            <span className="text-xs font-medium">{invoice.devise}</span>
                        </div>
                        {invoice.tauxChange && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Taux change</span>
                                <span className="text-xs">{parseFloat(invoice.tauxChange).toFixed(4)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold">Équivalent TND</span>
                            <MoneyCell value={invoice.montantTND} className="text-xs font-bold" />
                        </div>
                        <Separator />
                    </>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Net à Payer</span>
                    <span className="text-sm font-bold">
                        {formatCurrency(
                            new Big(invoice.totalTTC)
                                .minus(new Big(invoice.totalRetenue))
                                .toFixed(3),
                            invoice.devise
                        )}
                    </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Payé</span>
                    <span className="text-xs font-medium text-emerald-600">
                        {formatCurrency(invoice.montantPaye, invoice.devise)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold">Reste à Payer</span>
                    <span
                        className={`text-xs font-bold ${resteAPayer.gt(0) ? "text-red-500" : "text-emerald-600"
                            }`}
                    >
                        {formatCurrency(invoice.resteAPayer, invoice.devise)}
                    </span>
                </div>
            </SectionCard>
        </div>
    );
}
