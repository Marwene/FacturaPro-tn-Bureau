"use client";

import { useAchatFormStore } from "@/lib/stores/achats-store";
import { useProducts } from "@/hooks/use-queries";
import type { SerializedProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MoneyCell } from "@/components/shared/money-cell";
import { calcLineTotals } from "@/lib/calc-line-totals";
import { Plus, Trash2 } from "lucide-react";

export function AchatFormLines() {
    const form = useAchatFormStore();
    const { data: productsData } = useProducts();
    const products = productsData?.products ?? [];

    const filteredProducts = products.filter(p => {
        const q = form.productSearch.toLowerCase();
        return p.nom.toLowerCase().includes(q) ||
            (p.code && p.code.toLowerCase().includes(q));
    });

    const handleProductSelect = (lineId: string, productId: string) => {
        if (productId === "none") return;
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        form.updateLine(lineId, {
            productId: product.id,
            description: product.nom,
            prixAchat: product.prixAchat,
        });
    };

    return (
        <div className="col-span-2">
            <div className="flex items-center justify-between pb-3">
                <span className="text-sm font-semibold">Lignes d&apos;Achat</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => form.addLine()}
                >
                    <Plus className="h-3 w-3" />
                    Ajouter une ligne
                </Button>
            </div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {["Produit", "Description", "Qté", "Prix Achat", "Rem.%", "TVA%", "Total HT", ""].map((h) => (
                                <TableHead key={h} className="text-left text-xs text-muted-foreground font-medium">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border">
                        {form.lines.map((line) => {
                            const { ht } = calcLineTotals(line);
                            return (
                                <TableRow key={line.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="py-2 pr-2">
                                        <Combobox
                                            value={products.find(p => p.id === line.productId) || null}
                                            onValueChange={(p) => handleProductSelect(line.id, p ? p.id : "none")}
                                            onInputValueChange={(val) => form.setProductSearch(val)}
                                            itemToStringLabel={(p) => p ? p.nom : ""}
                                        >
                                            <ComboboxInput className="h-7 text-xs w-36 bg-background" placeholder="Produit..." />
                                            <ComboboxContent className="min-w-[300px]">
                                                <ComboboxEmpty>Aucun produit.</ComboboxEmpty>
                                                <ComboboxList>
                                                    <ComboboxItem value={null}>Aucun</ComboboxItem>
                                                    {filteredProducts.map((p) => (
                                                        <ComboboxItem key={p.id} value={p}>
                                                            <span className="font-mono text-xs mr-1">{p.code}</span>
                                                            {p.nom}
                                                        </ComboboxItem>
                                                    ))}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    </TableCell>
                                    <TableCell className="py-2 pr-2">
                                        <Input
                                            value={line.description}
                                            onChange={(e) => form.updateLine(line.id, { description: e.target.value })}
                                            placeholder="Description..."
                                            className="h-7 text-xs min-w-36 bg-background"
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 pr-2">
                                        <Input
                                            type="text" inputMode="decimal"
                                            value={line.quantite}
                                            onChange={(e) => form.updateLine(line.id, { quantite: e.target.value })}
                                            className="h-7 text-xs text-right w-16 bg-background"
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 pr-2">
                                        <Input
                                            type="text" inputMode="decimal"
                                            value={line.prixAchat}
                                            onChange={(e) => form.updateLine(line.id, { prixAchat: e.target.value })}
                                            className="h-7 text-xs text-right w-24 bg-background"
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 pr-2">
                                        <Input
                                            type="text" inputMode="decimal"
                                            value={line.remise}
                                            onChange={(e) => form.updateLine(line.id, { remise: e.target.value })}
                                            className="h-7 text-xs text-right w-16 bg-background"
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 pr-2">
                                        <Select
                                            value={line.tauxTVA}
                                            onValueChange={(v) => form.updateLine(line.id, { tauxTVA: v })}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-16 bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["0", "7", "13", "19"].map((t) => (
                                                    <SelectItem key={t} value={t}>{t}%</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="py-2 pr-2 text-right whitespace-nowrap">
                                        <MoneyCell value={ht.toString()} className="text-xs font-semibold" />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                            onClick={() => form.removeLine(line.id)}
                                            disabled={form.lines.length === 1}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
