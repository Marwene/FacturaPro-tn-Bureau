import { describe, it, expect } from "vitest";
import type { SerializedProduct } from "@/lib/types";
import {
    computeSupplierOptions,
    stockFillClass,
    stockFillPercent,
    summarizeStockAlerts,
} from "@/components/produits/produits-list-logic";

function makeSupplier(overrides: Partial<NonNullable<SerializedProduct["suppliers"]>[number]>) {
    return {
        productSupplierId: "ps-1",
        supplierId: "s-1",
        supplierName: "Fournisseur",
        purchasePrice: "5",
        salePrice: null,
        reference: null,
        isDefault: false,
        ...overrides,
    };
}

function makeProduct(overrides: Partial<SerializedProduct>): SerializedProduct {
    return {
        id: "p-1",
        code: "PRD-001",
        nom: "Produit",
        description: null,
        categorieId: null,
        categorieName: null,
        marqueId: null,
        marqueName: null,
        tiersId: null,
        tiersName: null,
        photoUrl: null,
        ficheTechniqueUrl: null,
        codeBarre: null,
        prixHT: "10",
        prixAchat: "6",
        prixAchatDefault: null,
        tauxTVA: "19",
        fodec: false,
        tauxFodec: "0",
        stockActuel: "0",
        stockMinimum: "0",
        unite: "U",
        estSurCommande: false,
        quantiteParUnite: null,
        stockStatus: "OK",
        actif: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        ...overrides,
    };
}

describe("computeSupplierOptions", () => {
    it("dédoublonne par supplierId et trie par nom", () => {
        const products = [
            makeProduct({ suppliers: [makeSupplier({ supplierId: "s-2", supplierName: "Zeta" })] }),
            makeProduct({ suppliers: [makeSupplier({ supplierId: "s-1", supplierName: "Alpha" })] }),
            makeProduct({ suppliers: [makeSupplier({ supplierId: "s-1", supplierName: "Alpha (dup)" })] }),
        ];
        expect(computeSupplierOptions(products)).toEqual([
            { id: "s-1", name: "Alpha" },
            { id: "s-2", name: "Zeta" },
        ]);
    });

    it("ignore les produits sans fournisseurs et renvoie [] sans données", () => {
        expect(computeSupplierOptions([makeProduct({})])).toEqual([]);
        expect(computeSupplierOptions([])).toEqual([]);
    });
});

describe("stockFillPercent", () => {
    it("retourne 80 par défaut quand le stock minimum vaut 0", () => {
        expect(stockFillPercent("12", "0")).toBe(80);
    });

    it("scale la jauge sur 3× le stock minimum", () => {
        expect(stockFillPercent("0", "10")).toBe(0);
        expect(stockFillPercent("15", "10")).toBe(50);
        expect(stockFillPercent("30", "10")).toBe(100);
    });

    it("plafonne la jauge à 100", () => {
        expect(stockFillPercent("100", "10")).toBe(100);
    });
});

describe("stockFillClass", () => {
    it("mappe le statut de stock sur la couleur de la jauge", () => {
        expect(stockFillClass("OK")).toBe("bg-emerald-500");
        expect(stockFillClass("CRITIQUE")).toBe("bg-red-500");
        expect(stockFillClass("RUPTURE")).toBe("bg-red-800");
    });
});

describe("summarizeStockAlerts", () => {
    it("compte les critiques (CRITIQUE + RUPTURE) et les ruptures seules", () => {
        const products = [
            makeProduct({ stockStatus: "OK" }),
            makeProduct({ stockStatus: "CRITIQUE" }),
            makeProduct({ stockStatus: "RUPTURE" }),
            makeProduct({ stockStatus: "RUPTURE" }),
        ];
        expect(summarizeStockAlerts(products)).toEqual({ critiques: 3, ruptures: 2 });
    });

    it("retourne des zéros sans alerte ni sans produits", () => {
        expect(summarizeStockAlerts([makeProduct({ stockStatus: "OK" })])).toEqual({
            critiques: 0,
            ruptures: 0,
        });
        expect(summarizeStockAlerts([])).toEqual({ critiques: 0, ruptures: 0 });
    });
});
