"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Building2, CircleCheck, Plus, Trash2 } from "lucide-react";
import { ProduitFormSection } from "./produit-form-section";
import {
    type ProduitFormSuppliersController,
    type FournisseurListItem,
} from "@/hooks/use-produit-form-suppliers";

interface ProduitFormSuppliersSectionProps {
    suppliers: ProduitFormSuppliersController;
    fournisseurs: Record<string, unknown>[];
}

export function ProduitFormSuppliersSection({ suppliers, fournisseurs }: ProduitFormSuppliersSectionProps) {
    const {
        formSuppliers,
        newSupplierId,
        newSupplierPrice,
        newSupplierRef,
        setNewSupplierId,
        setNewSupplierPrice,
        setNewSupplierRef,
        handleAddSupplier,
        handleRemoveSupplier,
        handleSetDefaultSupplier,
    } = suppliers;

    return (
        <ProduitFormSection
            icon={Building2}
            title="Fournisseurs"
            description={<>Associé des fournisseurs avec leurs prix d&apos;achat</>}
        >
            {/* Liste des fournisseurs ajoutés */}
            {formSuppliers.length > 0 && (
                <div className="space-y-2 mb-4">
                    {formSuppliers.map((supplier, index) => {
                        const supplierList = fournisseurs as FournisseurListItem[];
                        const supplierName = supplierList.find(
                            (f) => f.id === supplier.supplierId
                        )?.raisonSociale ?? "Inconnu";
                        return (
                            <div
                                key={supplier.supplierId}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{supplierName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="tabular-nums">{supplier.purchasePrice.toFixed(3)} DT</span>
                                            {supplier.reference && <span className="mx-1">·</span>}
                                            {supplier.reference && <span>{supplier.reference}</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 shrink-0"
                                        onClick={() => handleSetDefaultSupplier(index)}
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
                                        onClick={() => handleRemoveSupplier(index)}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Formulaire d'ajout */}
            <div className="flex flex-col sm:flex-row gap-2">
                <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                    <SelectTrigger className="h-9 text-sm sm:flex-1">
                        <SelectValue placeholder="Fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                        {(fournisseurs as FournisseurListItem[]).map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.raisonSociale}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={newSupplierPrice}
                    onChange={(e) => setNewSupplierPrice(e.target.value)}
                    placeholder="Prix d'achat"
                    className="h-9 text-sm sm:w-32"
                />
                <Input
                    value={newSupplierRef}
                    onChange={(e) => setNewSupplierRef(e.target.value)}
                    placeholder="Référence"
                    className="h-9 text-sm sm:w-32"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1"
                    onClick={handleAddSupplier}
                    disabled={!newSupplierId || !newSupplierPrice}
                >
                    <Plus className="size-3.5" />
                    Ajouter
                </Button>
            </div>
            {formSuppliers.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                    Aucun fournisseur ajouté. Le prix d&apos;achat servira par défaut.
                </p>
            )}
        </ProduitFormSection>
    );
}
