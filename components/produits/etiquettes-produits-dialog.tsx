"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProductsForLabels } from "@/hooks/use-products-for-labels";
import { useProductVariantsList } from "@/hooks/use-product-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ProductQRCode } from "./product-qr-code";
import { BarcodeDisplay } from "@/components/barcode-display";
import { generateProductQRData } from "@/lib/qr-data";
import { formatTND } from "@/lib/decimal";
import { Search, Printer, Package, X } from "lucide-react";
import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";

interface EtiquettesProduitsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type LabelOption = "qr" | "barcode" | "name" | "code" | "price" | "category" | "variant";

const ALL_OPTIONS: { key: LabelOption; label: string }[] = [
    { key: "qr", label: "QR Code" },
    { key: "barcode", label: "Code-barres" },
    { key: "name", label: "Nom" },
    { key: "code", label: "Code" },
    { key: "price", label: "Prix HT" },
    { key: "category", label: "Catégorie" },
    { key: "variant", label: "Déclinaison" },
];

interface LabelRow {
    product: SerializedProduct;
    variant: SerializedProductVariant | null;
}

export function EtiquettesProduitsDialog({ open, onOpenChange }: EtiquettesProduitsDialogProps) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Map<string, LabelRow>>(new Map());
    const [options, setOptions] = useState<Set<LabelOption>>(new Set(["qr", "name", "code", "price"]));
    const [printMode, setPrintMode] = useState(false);

    const { data } = useProductsForLabels(open);

    const products = data?.products ?? [];
    const filtered = products.filter((p) =>
        !search || p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );

    const selectedIds = useMemo(() => Array.from(selected.keys()), [selected]);

    const variantMap = useProductVariantsList(selectedIds);

    const toggleProduct = useCallback((productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        const next = new Map(selected);
        if (next.has(productId)) {
            next.delete(productId);
        } else {
            next.set(productId, { product, variant: null });
        }
        setSelected(next);
    }, [selected, products]);

    const setVariant = useCallback((productId: string, variant: SerializedProductVariant | null) => {
        setSelected((prev) => {
            const next = new Map(prev);
            const row = next.get(productId);
            if (row) next.set(productId, { ...row, variant });
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        const next = new Map<string, LabelRow>();
        filtered.forEach((p) => {
            next.set(p.id, { product: p, variant: null });
        });
        setSelected(next);
    }, [filtered]);

    const deselectAll = useCallback(() => {
        setSelected(new Map());
    }, []);

    const toggleOption = useCallback((key: LabelOption) => {
        setOptions((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const printItems: LabelRow[] = [];
    selected.forEach((row) => {
        const variants = variantMap.get(row.product.id) ?? [];
        const activeVariants = variants.filter((v) => v.actif);
        if (row.variant) {
            printItems.push(row);
        } else if (activeVariants.length > 0) {
            activeVariants.forEach((v) => printItems.push({ product: row.product, variant: v }));
        } else {
            printItems.push(row);
        }
    });

    const handlePrint = useCallback(() => {
        if (selected.size === 0) return;
        setPrintMode(true);
    }, [selected]);

    // Justification useEffect : API navigateur d'impression (window.print + événement afterprint) — déclenche l'impression une fois l'aperçu peint puis écoute la fermeture du dialogue d'impression navigateur (non réactif : afterprint est un événement navigateur, pas un état React).
    useEffect(() => {
        if (printMode) {
            const timer = setTimeout(() => {
                window.print();
            }, 300);
            const afterPrint = () => {
                setPrintMode(false);
                onOpenChange(false);
                setSelected(new Map());
            };
            window.addEventListener("afterprint", afterPrint, { once: true });
            return () => {
                clearTimeout(timer);
                window.removeEventListener("afterprint", afterPrint);
            };
        }
    }, [printMode, onOpenChange]);

    if (printMode) {
        return (
            <div className="fixed inset-0 z-[100] bg-white print:bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b print:hidden bg-white">
                    <h2 className="text-sm font-semibold">Aperçu avant impression</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{printItems.length} étiquette(s)</span>
                        <Button variant="outline" size="sm" onClick={() => { setPrintMode(false); }}>
                            <X className="size-3.5 mr-1.5" /> Annuler
                        </Button>
                        <Button size="sm" onClick={() => window.print()}>
                            <Printer className="size-3.5 mr-1.5" /> Imprimer
                        </Button>
                    </div>
                </div>
                <ScrollArea className="h-[calc(100vh-57px)]">
                    <LabelsGrid items={printItems} options={options} />
                </ScrollArea>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Étiquettes produits</DialogTitle>
                    <DialogDescription>
                        Sélectionnez les produits et les informations à afficher sur les étiquettes
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-6 flex-1 min-h-0">
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un produit..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-muted-foreground">
                                {selected.size} sélectionné(s) · {printItems.length} étiquette(s)
                            </span>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-[10px] text-primary hover:underline">Tout</button>
                                <button onClick={deselectAll} className="text-[10px] text-muted-foreground hover:underline">Aucun</button>
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
                                                    onCheckedChange={() => toggleProduct(p.id)}
                                                />
                                                <Package className="size-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-medium truncate flex-1">{p.nom}</span>
                                                <span className="text-muted-foreground font-mono shrink-0">{p.code}</span>
                                            </label>
                                            {selected.has(p.id) && activeVariants.length > 0 && (
                                                <div className="pl-8 pr-3 pb-1">
                                                    <Select
                                                        value={row?.variant?.id ?? "default"}
                                                        onValueChange={(v) => setVariant(p.id, v === "default" ? null : activeVariants.find((av) => av.id === v) ?? null)}
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

                    <div className="w-48 shrink-0 space-y-4">
                        <div>
                            <h4 className="text-xs font-semibold mb-2">Affichage</h4>
                            <div className="space-y-2">
                                {ALL_OPTIONS.map((opt) => (
                                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={options.has(opt.key)}
                                            onCheckedChange={() => toggleOption(opt.key)}
                                        />
                                        <span className="text-xs">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h4 className="text-xs font-semibold mb-2">Aperçu</h4>
                            {printItems.length > 0 ? (
                                <div className="border rounded-xl p-3 space-y-2">
                                    <LabelPreview item={printItems[0]} options={options} />
                                </div>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">
                                    Sélectionnez un produit pour voir l&apos;aperçu
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button size="sm" onClick={handlePrint} disabled={selected.size === 0}>
                        <Printer className="size-3.5 mr-1.5" />
                        Imprimer ({printItems.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LabelPreview({ item, options }: { item: LabelRow; options: Set<LabelOption> }) {
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

function LabelsGrid({ items, options }: { items: LabelRow[]; options: Set<LabelOption> }) {
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
