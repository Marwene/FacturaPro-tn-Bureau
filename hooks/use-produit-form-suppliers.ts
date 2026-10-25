"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import type { ProductSupplierInput } from "@/lib/schemas";
import type { ProductSupplierOption } from "@/lib/types";

export type FournisseurListItem = { id: string; raisonSociale: string };

export function useProduitFormSuppliers(initialSuppliers?: ProductSupplierOption[]) {
    // ── Suppliers ──
    const [formSuppliers, setFormSuppliers] = useState<ProductSupplierInput[]>(() => {
        if (initialSuppliers) {
            return initialSuppliers.map((s) => ({
                supplierId: s.supplierId,
                purchasePrice: parseFloat(s.purchasePrice),
                reference: s.reference ?? null,
                isDefault: s.isDefault,
            }));
        }
        return [];
    });
    const [newSupplierId, setNewSupplierId] = useState<string>("");
    const [newSupplierPrice, setNewSupplierPrice] = useState<string>("");
    const [newSupplierRef, setNewSupplierRef] = useState<string>("");

    // ── Supplier handlers ──
    const handleAddSupplier = () => {
        if (!newSupplierId || !newSupplierPrice) return;
        const alreadyExists = formSuppliers.some((s) => s.supplierId === newSupplierId);
        if (alreadyExists) {
            notify.warning({
                title: "Fournisseur déjà associé",
                description: "Ce fournisseur figure déjà dans la liste des fournisseurs du produit.",
            });
            return;
        }
        const hasDefault = formSuppliers.some((s) => s.isDefault);
        setFormSuppliers([
            ...formSuppliers,
            {
                supplierId: newSupplierId,
                purchasePrice: parseFloat(newSupplierPrice),
                reference: newSupplierRef || null,
                isDefault: formSuppliers.length === 0 && !hasDefault,
            },
        ]);
        setNewSupplierId("");
        setNewSupplierPrice("");
        setNewSupplierRef("");
    };

    const handleRemoveSupplier = (index: number) => {
        setFormSuppliers(formSuppliers.filter((_, i) => i !== index));
    };

    const handleSetDefaultSupplier = (index: number) => {
        setFormSuppliers(formSuppliers.map((s, i) => ({
            ...s,
            isDefault: i === index,
        })));
    };

    return {
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
    };
}

export type ProduitFormSuppliersController = ReturnType<typeof useProduitFormSuppliers>;
