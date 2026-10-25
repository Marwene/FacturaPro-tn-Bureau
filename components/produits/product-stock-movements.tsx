"use client";

import { useStockMovements } from "@/hooks/use-stock-movements";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    ENTREE: { label: "Entrée", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: <ArrowUp className="size-3.5" /> },
    SORTIE: { label: "Sortie", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: <ArrowDown className="size-3.5" /> },
    AJUSTEMENT: { label: "Ajustement", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", icon: <Minus className="size-3.5" /> },
};

export function ProduitStockMovements({ productId }: { productId: string }) {
    const { data, isLoading } = useStockMovements(productId);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }

    const movements = data?.movements ?? [];

    if (movements.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                Aucun mouvement enregistré
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="w-24 text-right">Qté</TableHead>
                    <TableHead className="w-36">Date</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {movements.map((m) => {
                    const cfg = typeConfig[m.type] ?? typeConfig.AJUSTEMENT;
                    return (
                        <TableRow key={m.id}>
                            <TableCell>
                                <Badge variant="outline" className={`gap-1.5 text-[10px] font-medium ${cfg.color} border-0`}>
                                    {cfg.icon}
                                    {cfg.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                                {m.quantite}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {formatDateTime(m.date)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {m.referenceType === "ACHAT" ? (
                                    <span className="font-medium">Achat {m.referenceId}</span>
                                ) : m.referenceType === "VENTE" ? (
                                    <span className="font-medium">Vente {m.referenceId}</span>
                                ) : (
                                    <span className="text-muted-foreground/60">—</span>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                                {m.notes ?? <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
