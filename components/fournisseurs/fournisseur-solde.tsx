"use client";

import { useState } from "react";
import { useFournisseurSolde, type FournisseurSoldeEntry } from "@/hooks/use-fournisseurs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/shared/form-field";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatTND } from "@/lib/decimal";
import { Download } from "lucide-react";

export function FournisseurSoldeTable({ fournisseurId }: { fournisseurId: string }) {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfYear = `${new Date().getFullYear()}-01-01`;
    const [from, setFrom] = useState(firstOfYear);
    const [to, setTo] = useState(today);

    const { data, isLoading } = useFournisseurSolde(fournisseurId, from, to);

    const handlePrint = () => window.print();

    return (
        <div className="space-y-4">
            <SectionCard title="Filtrer par date" contentClassName="pt-3">
                <div className="flex items-end gap-3">
                    <FormField label="Du" className="gap-1 w-auto">
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="h-8 text-sm w-44"
                        />
                    </FormField>
                    <FormField label="Au" className="gap-1 w-auto">
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="h-8 text-sm w-44"
                        />
                    </FormField>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={handlePrint}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exporter
                    </Button>
                </div>
            </SectionCard>

            <SectionCard title="Grand-Livre Fournisseur" contentClassName="p-0 pt-3">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs text-muted-foreground py-2 pl-4 w-24">Date</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 w-28">Pièce</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 w-24">Mouvement</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2">Commentaire</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right w-28">Débit</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right w-28">Crédit</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right w-28 pr-4">Solde</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.entries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                                                Aucun mouvement sur cette période.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data?.entries.map((entry: FournisseurSoldeEntry) => (
                                            <TableRow key={entry.id} className="hover:bg-muted/30">
                                                <TableCell className="py-1.5 pl-4 text-xs font-mono">
                                                    <DateCell value={entry.date} />
                                                </TableCell>
                                                <TableCell className="py-1.5 text-xs font-medium">
                                                    {entry.piece}
                                                </TableCell>
                                                <TableCell className="py-1.5 text-xs">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                                        entry.mouvement === "Facture achat"
                                                            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                                            : "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                                    }`}>
                                                        {entry.mouvement}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-xs text-muted-foreground max-w-40 truncate">
                                                    {entry.commentaire || "—"}
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right text-xs font-mono">
                                                    {parseFloat(entry.debit) > 0 ? formatTND(entry.debit) : "—"}
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right text-xs font-mono">
                                                    {parseFloat(entry.credit) > 0 ? formatTND(entry.credit) : "—"}
                                                </TableCell>
                                                <TableCell className={`py-1.5 text-right text-xs font-mono font-semibold pr-4 ${
                                                    parseFloat(entry.solde) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                                }`}>
                                                    <MoneyCell value={entry.solde} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </SectionCard>

            {data && data.entries.length > 0 && (
                <SectionCard title="Totaux" contentClassName="pt-3">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Total Débit</p>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                <MoneyCell value={data.totalDebit} />
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Total Crédit</p>
                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                <MoneyCell value={data.totalCredit} />
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Solde Final</p>
                            <p className={`text-sm font-bold ${
                                parseFloat(data.soldeFinal) > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-green-600 dark:text-green-400"
                            }`}>
                                <MoneyCell value={data.soldeFinal} />
                            </p>
                        </div>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
