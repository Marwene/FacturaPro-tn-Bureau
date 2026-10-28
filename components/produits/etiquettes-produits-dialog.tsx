"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProductsForLabels } from "@/hooks/use-products-for-labels";
import { useProductVariantsList } from "@/hooks/use-product-variants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EtiquettesProduitsSelect, LabelPreview, LabelsGrid } from "./etiquettes-produits-sections";
import { ALL_OPTIONS, buildPrintItems, type LabelOption, type LabelRow } from "./etiquettes-produits-logic";
import { Printer, X } from "lucide-react";
import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";

interface EtiquettesProduitsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EtiquettesProduitsDialog({ open, onOpenChange }: EtiquettesProduitsDialogProps) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Map<string, LabelRow>>(new Map());
    const [options, setOptions] = useState<Set<LabelOption>>(new Set(["qr", "name", "code", "price"]));
    const [printMode, setPrintMode] = useState(false);

    const { data } = useProductsForLabels(open);

    const products = data?.products ?? [];

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

    const selectAll = useCallback((filtered: SerializedProduct[]) => {
        const next = new Map<string, LabelRow>();
        filtered.forEach((p) => {
            next.set(p.id, { product: p, variant: null });
        });
        setSelected(next);
    }, []);

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

    const printItems = buildPrintItems(selected, variantMap);

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
                    <EtiquettesProduitsSelect
                        products={products}
                        selected={selected}
                        variantMap={variantMap}
                        printItemsCount={printItems.length}
                        search={search}
                        onSearchChange={setSearch}
                        onToggleProduct={toggleProduct}
                        onSetVariant={setVariant}
                        onSelectAll={selectAll}
                        onDeselectAll={deselectAll}
                    />

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
