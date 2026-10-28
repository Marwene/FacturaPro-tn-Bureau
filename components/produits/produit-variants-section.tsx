"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import type { VariantFormData } from "./variants-logic";
import {
    commitVariantEdit,
    countActiveVariants,
    emptyVariant,
    removeVariantAt,
    totalVariantsStock,
} from "./variants-logic";
import { ProduitVariantEditDialog } from "./produit-variants-dialog";
import { ProduitVariantsTable } from "./produit-variants-table";

export type { VariantFormData };

interface ProduitVariantsSectionProps {
    variants: VariantFormData[];
    onChange: (variants: VariantFormData[]) => void;
    readOnly?: boolean;
}

export function ProduitVariantsSection({ variants, onChange, readOnly }: ProduitVariantsSectionProps) {
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editData, setEditData] = useState<VariantFormData>(emptyVariant(0));

    const openAdd = () => {
        setEditData(emptyVariant(variants.length));
        setEditIndex(-1);
    };

    const openEdit = (idx: number) => {
        setEditData({ ...variants[idx] });
        setEditIndex(idx);
    };

    const saveEdit = () => {
        if (editIndex === null) return;
        onChange(commitVariantEdit(variants, editIndex, editData));
        setEditIndex(null);
    };

    const remove = (idx: number) => {
        onChange(removeVariantAt(variants, idx));
    };

    const totalStock = totalVariantsStock(variants);
    const activeCount = countActiveVariants(variants);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">
                        {variants.length} déclinaison(s) · {activeCount} active(s) · Stock total : {totalStock}
                    </p>
                </div>
                {!readOnly && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
                        <Plus className="size-3.5" /> Ajouter
                    </Button>
                )}
            </div>

            {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune déclinaison. Ajoutez des variantes (couleur, taille, etc.)
                </p>
            ) : (
                <ProduitVariantsTable
                    variants={variants}
                    readOnly={readOnly}
                    onReorder={onChange}
                    onEdit={openEdit}
                    onDelete={remove}
                />
            )}

            <ProduitVariantEditDialog
                open={editIndex !== null}
                onOpenChange={(open) => { if (!open) setEditIndex(null); }}
                isNew={editIndex === -1}
                data={editData}
                setData={setEditData}
                onSave={saveEdit}
            />
        </div>
    );
}
