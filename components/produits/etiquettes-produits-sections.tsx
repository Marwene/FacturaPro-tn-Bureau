"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ProductQRCode } from "./product-qr-code";
import { BarcodeDisplay } from "@/components/barcode-display";
import { generateProductQRData } from "@/lib/qr-data";
import { formatTND } from "@/lib/decimal";
import { Search, Package } from "lucide-react";
import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";
import { filterProduits, type LabelOption, type LabelRow } from "./etiquettes-produits-logic";

interface EtiquettesProduitsSelectProps {
    products: SerializedProduct[];
    selected: Map<string, LabelRow>;
    variantMap: Map<string, SerializedProductVariant[]>;
    printItemsCount: number;
    search: string;
    onSearchChange: (value: string) => void;
    onToggleProduct: (productId: string) => void;
    onSetVariant: (productId: string, variant: SerializedProductVariant | null) => void;
    onSelectAll: (products: SerializedProduct[]) => void;
    onDeselectAll: () => void;
}

export function EtiquettesProduitsSelect({
    products,
    selected,
    variantMap,
    printItemsCount,
    search,
    onSearchChange,
    onToggleProduct,
    onSetVariant,
    onSelectAll,
    onDeselectAll,
}: EtiquettesProduitsSelectProps) {
    const filtered = filterProduits(products, search);

    return (
        <div className="flex-1 flex flex-col min-w-0">
            <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                    placeholder="Rechercher un produit..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8 h-8 text-xs"
                />
            </div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">
                    {selected.size} sélectionné(s) · {printItemsCount} étiquette(s)
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onSelectAll(filtered)} className="text-[10px] text-primary hover:underline">Tout</button>
                    <button onClick={onDeselectAll} className="text-[10px] text-muted-foreground hover:underline">Aucun</button>
                </div>
            </div>
            <ScrollArea className="flex-1 border rounded-xl">
                <div className="p-1 space-y-0.5">
                    {filtered.map((p) => {
                        const variants = variantMap.get(p.id) ?? [];
                        const activeVariants = variants.filter((v) => v.actif);
                        const row = selected.get(p.id);
                        return (
                            <div key={p.id} className="space-y-0.5">
                                <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer text-xs">
                                    <Checkbox
                                        checked={selected.has(p.id)}
                                        onCheckedChange={() => onToggleProduct(p.id)}
                                    />
                                    <Package className="size-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium truncate flex-1">{p.nom}</span>
                                    <span className="text-muted-foreground font-mono shrink-0">{p.code}</span>
                                </label>
                                {selected.has(p.id) && activeVariants.length > 0 && (
                                    <div className="pl-8 pr-3 pb-1">
                                        <Select
                                            value={row?.variant?.id ?? "default"}
                                            onValueChange={(v) => onSetVariant(p.id, v === "default" ? null : activeVariants.find((av) => av.id === v) ?? null)}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-full bg-background">
                                                <SelectValue placeholder="Toutes les déclinaisons" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default" className="text-xs">Toutes les déclinaisons</SelectItem>
                                                {activeVariants.map((v) => (
                                                    <SelectItem key={v.id} value={v.id} className="text-xs">{v.nom}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">Aucun résultat</p>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export function LabelPreview({ item, options }: { item: LabelRow; options: Set<LabelOption> }) {
    const { product, variant } = item;
    const qrData = generateProductQRData({
        id: product.id,
        code: product.code,
        nom: product.nom,
        description: product.description,
        categorie: product.categorieName,
        prixHT: variant?.prixHT ?? product.prixHT,
        tauxTVA: product.tauxTVA,
        stockActuel: variant?.stockActuel ?? product.stockActuel,
        unite: product.unite,
    });

    return (
        <div className="flex flex-col items-center gap-2 text-center">
            {options.has("qr") && (
                <ProductQRCode codeBarre={qrData} nom={product.nom} code={product.code} compact />
            )}
            {options.has("barcode") && (
                <BarcodeDisplay value={product.code} compact />
            )}
            {options.has("name") && (
                <p className="text-[11px] font-semibold leading-tight">
                    {product.nom}{variant ? ` — ${variant.nom}` : ""}
                </p>
            )}
            {options.has("variant") && variant && (
                <p className="text-[9px] text-muted-foreground">{variant.nom}</p>
            )}
            {options.has("code") && (
                <p className="text-[9px] font-mono text-muted-foreground">{variant?.code ?? product.code}</p>
            )}
            {options.has("price") && (
                <p className="text-xs font-bold">{formatTND(variant?.prixHT ?? product.prixHT)}</p>
            )}
            {options.has("category") && product.categorieName && (
                <p className="text-[9px] text-muted-foreground">{product.categorieName}</p>
            )}
        </div>
    );
}

export function LabelsGrid({ items, options }: { items: LabelRow[]; options: Set<LabelOption> }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6 print:gap-3 print:p-4">
            {items.map((item, idx) => (
                <div
                    key={`${item.product.id}-${item.variant?.id ?? idx}`}
                    className="border rounded-2xl p-4 flex flex-col items-center gap-2 text-center break-inside-avoid print:border-2 print:shadow-none"
                >
                    <LabelPreview item={item} options={options} />
                </div>
            ))}
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @page { margin: 8mm; size: A4; }
                }
            `}</style>
        </div>
    );
}
