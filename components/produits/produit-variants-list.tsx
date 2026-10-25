"use client";

import { useProductVariants } from "@/hooks/use-product-variants";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";

export function ProduitVariantsList({ productId }: { productId: string }) {
    const { data, isLoading } = useProductVariants(productId);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }

    const variants = data?.variants ?? [];

    if (variants.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-6">
                Aucune déclinaison pour ce produit
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Déclinaison</TableHead>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead className="w-20 text-right">Prix HT</TableHead>
                    <TableHead className="w-20 text-right">Stock</TableHead>
                    <TableHead className="w-20 text-right">Min.</TableHead>
                    <TableHead className="w-24">Statut</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {variants.map((v) => {
                    const stock = parseFloat(v.stockActuel);
                    const min = parseFloat(v.stockMinimum);
                    const status = stock <= 0 ? "RUPTURE" : stock <= min ? "CRITIQUE" : "OK";
                    const attributsStr = v.attributs
                        ? Object.entries(v.attributs).map(([k, val]) => `${k}: ${val}`).join(", ")
                        : null;

                    return (
                        <TableRow key={v.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Package className="size-3.5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">{v.nom}</p>
                                        {attributsStr && (
                                            <p className="text-[10px] text-muted-foreground">{attributsStr}</p>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                                {v.code || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
                                {v.prixHT || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium">
                                {v.stockActuel}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums text-muted-foreground">
                                {v.stockMinimum}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`text-[10px] border-0 ${
                                    status === "RUPTURE" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                                    status === "CRITIQUE" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" :
                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                }`}>
                                    {status === "OK" ? "OK" : status === "CRITIQUE" ? "Critique" : "Rupture"}
                                </Badge>
                                {!v.actif && (
                                    <Badge variant="outline" className="text-[10px] ml-1">Inactif</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
