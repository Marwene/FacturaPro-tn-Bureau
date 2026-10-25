"use client";

import { Fragment } from "react";
import type { SerializedInvoice, SerializedInvoiceLine } from "@/lib/types";
import { SectionCard } from "@/components/shared/section-card";
import { DateCell } from "@/components/shared/date-cell";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/decimal";

interface FactureDetailLinesProps {
    invoice: SerializedInvoice;
    lines: SerializedInvoiceLine[];
    payments: {
        id: string;
        dateReglement: Date;
        methode: string;
        reference: string | null;
        montant: string;
    }[];
}

type BLGroup = {
    blId: string | null;
    blNumero?: string;
    lines: SerializedInvoiceLine[];
};

function groupLinesByBL(lines: SerializedInvoiceLine[]): BLGroup[] {
    const hasAnyBL = lines.some((l) => l.bonLivraisonId);
    if (!hasAnyBL) {
        return [{ blId: null, lines }];
    }

    const groups: BLGroup[] = [];
    for (const line of lines) {
        const blId = line.bonLivraisonId ?? null;
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.blId === blId) {
            lastGroup.lines.push(line);
        } else {
            groups.push({
                blId,
                lines: [line],
            });
        }
    }
    return groups;
}

export function FactureDetailLines({ invoice, lines, payments }: FactureDetailLinesProps) {
    const groupedLines = groupLinesByBL(lines);

    return (
        <>
            <SectionCard title="Lignes de Facturation" contentClassName="p-0 pt-3">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs text-muted-foreground py-2 pl-4">Description</TableHead>
                            <TableHead className="text-xs text-muted-foreground py-2 text-right">Qté</TableHead>
                            <TableHead className="text-xs text-muted-foreground py-2 text-right">P.U. HT</TableHead>
                            <TableHead className="text-xs text-muted-foreground py-2 text-right">Rem.</TableHead>
                            <TableHead className="text-xs text-muted-foreground py-2 text-right">TVA</TableHead>
                            <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Total HT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedLines.map((group, groupIdx) => (
                            <Fragment key={group.blId ?? `group-${groupIdx}`}>
                                {group.blId && (
                                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                                        <TableCell colSpan={6} className="py-2 pl-4">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                <span>📦</span>
                                                <span>{group.blNumero ?? `BL-${group.blId.slice(0, 8)}`}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {group.lines.map((line) => (
                                    <TableRow key={line.id} className="hover:bg-muted/30">
                                        <TableCell className="py-2 pl-4">
                                            <p className="text-xs font-medium">{line.description}</p>
                                            {line.product && (
                                                <p className="text-xs text-muted-foreground">
                                                    {(line.product as { code?: string }).code ?? ""}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs">
                                            {line.quantite}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs">
                                            {formatCurrency(line.prixHT, invoice.devise)}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs">
                                            {parseFloat(line.remise) > 0 ? `${line.remise}%` : "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs">
                                            {line.tauxTVA}%
                                            {line.fodec && (
                                                <span className="ml-1 text-muted-foreground">+F</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right text-xs font-medium pr-4">
                                            {formatCurrency(line.totalHT, invoice.devise)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </SectionCard>

            {payments.length > 0 && (
                <SectionCard title="Historique des Paiements" contentClassName="p-0 pt-3">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs text-muted-foreground py-2 pl-4">Date</TableHead>
                                <TableHead className="text-xs text-muted-foreground py-2">Méthode</TableHead>
                                <TableHead className="text-xs text-muted-foreground py-2">Référence</TableHead>
                                <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((p) => (
                                <TableRow key={p.id} className="hover:bg-muted/30">
                                    <TableCell className="py-2 pl-4 text-xs">
                                        <DateCell value={p.dateReglement} />
                                    </TableCell>
                                    <TableCell className="py-2 text-xs">
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {p.methode.toLowerCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-muted-foreground">
                                        {p.reference ?? "—"}
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600 pr-4">
                                        {formatCurrency(p.montant, invoice.devise)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </SectionCard>
            )}
        </>
    );
}
