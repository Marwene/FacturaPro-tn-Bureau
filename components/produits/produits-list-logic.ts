import type { SerializedProduct, StockStatus } from "@/lib/types";

/**
 * Logique pure du listing produits — extraite de `produits-client.tsx`
 * (lot I, découpage des gros composants). Aucune dépendance UI :
 * testable via `lib/__tests__/produits-list-logic.test.ts`.
 */

export interface SupplierOption {
    id: string;
    name: string;
}

/** Fournisseurs uniques (dedup par `supplierId`) pour le filtre, triés par nom. */
export function computeSupplierOptions(products: SerializedProduct[]): SupplierOption[] {
    const map = new Map<string, string>();
    for (const p of products) {
        for (const s of p.suppliers ?? []) {
            if (!map.has(s.supplierId)) map.set(s.supplierId, s.supplierName);
        }
    }
    return Array.from(map.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Largeur de la jauge de stock (%), basée sur 3× le stock minimum, plafonnée à 100. */
export function stockFillPercent(stockActuel: string, stockMinimum: string): number {
    const current = parseFloat(stockActuel);
    const min = parseFloat(stockMinimum);
    return min > 0 ? Math.min((current / (min * 3)) * 100, 100) : 80;
}

/** Couleur de remplissage de la jauge selon le statut de stock. */
export function stockFillClass(status: StockStatus): string {
    if (status === "CRITIQUE") return "bg-red-500";
    if (status === "RUPTURE") return "bg-red-800";
    return "bg-emerald-500";
}

export interface StockAlertSummary {
    critiques: number;
    ruptures: number;
}

/** Agrégat d'alertes stock : produits CRITIQUE + RUPTURE, et ruptures seules. */
export function summarizeStockAlerts(products: SerializedProduct[]): StockAlertSummary {
    const critiques = products.filter(
        (p) => p.stockStatus === "CRITIQUE" || p.stockStatus === "RUPTURE"
    );
    const ruptures = critiques.filter((p) => p.stockStatus === "RUPTURE").length;
    return { critiques: critiques.length, ruptures };
}
