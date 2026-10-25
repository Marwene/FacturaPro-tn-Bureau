"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/decimal";
import { Plus, Trash2, Building2, Loader2, History, GitCompareArrows, CircleCheck } from "lucide-react";
import { ProductSupplierPriceHistory } from "./product-supplier-price-history";
import { ProductSupplierComparison } from "./product-supplier-comparison";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    useProductSuppliers,
    useSupplierOptions,
    useAddProductSupplier,
    useDeleteProductSupplier,
    useSetDefaultProductSupplier,
} from "@/hooks/use-product-suppliers";

interface ProductSuppliersSectionProps {
    productId: string;
}

export function ProductSuppliersSection({ productId }: ProductSuppliersSectionProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [purchasePrice, setPurchasePrice] = useState<string>("");
    const [reference, setReference] = useState<string>("");
    const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<string | null>(null);
    const [showComparison, setShowComparison] = useState(false);

    const { data: suppliersData, isLoading } = useProductSuppliers(productId);
    const { data: allSuppliers } = useSupplierOptions();

    const addSupplierMutation = useAddProductSupplier(productId);
    const deleteSupplierMutation = useDeleteProductSupplier(productId);
    const setDefaultMutation = useSetDefaultProductSupplier(productId);

    const suppliers = suppliersData?.suppliers ?? [];
    const availableSuppliers = allSuppliers?.fournisseurs ?? [];

    const handleAdd = () => {
        if (!selectedSupplierId || !purchasePrice) return;
        addSupplierMutation.mutate(
            {
                supplierId: selectedSupplierId,
                purchasePrice: parseFloat(purchasePrice),
                reference: reference || undefined,
            },
            {
                onSuccess: () => {
                    setIsAddDialogOpen(false);
                    setSelectedSupplierId("");
                    setPurchasePrice("");
                    setReference("");
                },
            }
        );
    };

    return (
        <div className="space-y-3">
            {isLoading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
            ) : suppliers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                    Aucun fournisseur associé
                </p>
            ) : (
                <div className="space-y-2">
                    {suppliers.map((supplier) => (
                        <div key={supplier.id}>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors group">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{supplier.supplierName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="tabular-nums">{formatTND(String(supplier.purchasePrice))}</span>
                                            {supplier.reference && <span className="mx-1">·</span>}
                                            {supplier.reference && <span>{supplier.reference}</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        onClick={() =>
                                            setSelectedSupplierForHistory(
                                                selectedSupplierForHistory === supplier.id ? null : supplier.id
                                            )
                                        }
                                        title="Historique des prix"
                                    >
                                        <History className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 shrink-0"
                                        onClick={() => setDefaultMutation.mutate(supplier.id)}
                                        disabled={supplier.isDefault}
                                        title={supplier.isDefault ? "Fournisseur par défaut" : "Définir par défaut"}
                                    >
                                        <CircleCheck
                                            className={`size-4 transition-colors ${
                                                supplier.isDefault
                                                    ? "fill-amber-500 text-amber-500"
                                                    : "text-muted-foreground hover:text-amber-500"
                                            }`}
                                        />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteSupplierMutation.mutate(supplier.id)}
                                        disabled={deleteSupplierMutation.isPending}
                                    >
                                        {deleteSupplierMutation.isPending ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {selectedSupplierForHistory === supplier.id && (
                                <div className="mt-2 p-3 rounded-lg border bg-muted/20">
                                    <h4 className="text-xs font-semibold mb-3">Historique des prix</h4>
                                    <ProductSupplierPriceHistory
                                        productId={productId}
                                        supplierId={supplier.supplierId}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {suppliers.length > 1 && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setShowComparison(!showComparison)}
                    >
                        <GitCompareArrows className="size-3.5" />
                        {showComparison ? "Masquer la comparaison" : "Comparer les prix"}
                    </Button>
                    {showComparison && (
                        <div className="rounded-xl border bg-card p-3">
                            <ProductSupplierComparison productId={productId} />
                        </div>
                    )}
                </>
            )}

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                        <Plus className="size-3.5" />
                        Ajouter un fournisseur
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un fournisseur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Fournisseur</Label>
                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un fournisseur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSuppliers.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            {supplier.raisonSociale}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Prix d&apos;achat (TND)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={purchasePrice}
                                onChange={(e) => setPurchasePrice(e.target.value)}
                                placeholder="0.000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Référence (optionnel)</Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Référence du fournisseur"
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleAdd}
                            disabled={!selectedSupplierId || !purchasePrice || addSupplierMutation.isPending}
                        >
                            {addSupplierMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Ajouter
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
