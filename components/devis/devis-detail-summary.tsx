"use client";

import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/decimal";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import type Big from "big.js";
import type { SerializedQuote, SerializedQuoteLine } from "@/lib/types";

export type DevisClient = {
    raisonSociale: string;
    matriculeFiscal?: string;
    adresse?: string;
    ville?: string;
    telephone?: string;
    email?: string;
};

type DevisDetailSummaryProps = {
    quote: SerializedQuote;
    lines: SerializedQuoteLine[];
    client: DevisClient | undefined;
    devise: string;
    totalRemise: Big;
    remisePercent: string;
    tauxTVAMoyen: string;
    totalTVA: Big;
    timbreFiscal: Big;
    totalTTCWithTimbre: Big;
};

/** LEFT COLUMN — Client Card + Lines Table + Financial Summary (ex-devis-detail-client L240-389). */
export function DevisDetailSummary({ quote, lines, client, devise, totalRemise, remisePercent, tauxTVAMoyen, totalTVA, timbreFiscal, totalTTCWithTimbre }: DevisDetailSummaryProps) {
    return (
        <div className="space-y-5">
            {/* Client Card — Reference Card */}
            <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-secondary">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</h3>
                </div>
                <p className="font-semibold text-sm">{client?.raisonSociale ?? "—"}</p>
                {client?.matriculeFiscal && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        MF: {client.matriculeFiscal}
                    </p>
                )}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {client?.adresse && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="text-pretty">{client.adresse}{client.ville ? `, ${client.ville}` : ""}</span>
                        </div>
                    )}
                    {client?.telephone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{client.telephone}</span>
                        </div>
                    )}
                    {client?.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span>{client.email}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Lines Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold">Lignes du Devis</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-secondary/50 border-b border-border">
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 pl-5">Description</TableHead>
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">Qté</TableHead>
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">P.U. HT</TableHead>
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">Rem.</TableHead>
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">TVA</TableHead>
                            <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right pr-5">Total HT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <TableRow
                                key={line.id}
                                className={cn(
                                    "transition-colors duration-150 border-b border-border/30 last:border-b-0",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-secondary/20",
                                    "hover:bg-secondary/40"
                                )}
                            >
                                <TableCell className="py-3 pl-5">
                                    <p className="text-xs font-medium">{line.description}</p>
                                    {line.product && (
                                        <p className="text-[11px] text-muted-foreground font-mono">
                                            {(line.product as { code?: string }).code ?? ""}
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs tabular-nums">
                                    {line.quantite}
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs tabular-nums">
                                    {parseFloat(line.prixHT).toFixed(3)}
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs tabular-nums">
                                    {parseFloat(line.remise) > 0 ? (
                                        <span className="text-muted-foreground">{line.remise}%</span>
                                    ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs tabular-nums">
                                    {line.tauxTVA}%
                                    {line.fodec && (
                                        <span className="ml-1 text-muted-foreground">+F</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs font-medium pr-5 tabular-nums">
                                    {formatCurrency(line.totalHT, quote.devise)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Financial Summary — Progression */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</span>
                    <span className="text-[11px] text-muted-foreground">{lines.length} ligne{lines.length > 1 ? "s" : ""}</span>
                </div>
                <Separator />
                <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Base HT</span>
                        <span className="tabular-nums font-medium">{formatCurrency(quote.baseHT, devise)}</span>
                    </div>
                    {totalRemise.gt(0) && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Remise ({remisePercent}%)</span>
                            <span className="text-muted-foreground tabular-nums">−{formatCurrency(totalRemise.toFixed(3), devise)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold">
                        <span>Total HT</span>
                        <span className="tabular-nums">{formatCurrency(quote.totalHT, devise)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">TVA ({tauxTVAMoyen}%)</span>
                        <span className="tabular-nums">{formatCurrency(totalTVA, devise)}</span>
                    </div>
                    {parseFloat(quote.totalFodec) > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">FODEC (1%)</span>
                            <span className="tabular-nums">{formatCurrency(quote.totalFodec, devise)}</span>
                        </div>
                    )}
                    {timbreFiscal.gt(0) && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Timbre fiscal
                                <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-muted text-[10px] font-medium">1 DT</span>
                            </span>
                            <span className="tabular-nums">{formatCurrency(timbreFiscal, devise)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-baseline pt-1">
                        <span className="text-sm font-bold">Total TTC</span>
                        <span className="text-lg font-bold tabular-nums">{formatCurrency(totalTTCWithTimbre, devise)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
