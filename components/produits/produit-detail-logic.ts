import { formatTND } from "@/lib/decimal";
import type { SerializedProduct } from "@/lib/types";

/**
 * Logique pure de la fiche produit — extraite de `produit-detail-client.tsx`
 * (lot I, découpage des gros composants). Aucune dépendance UI ni React :
 * testable via `lib/__tests__/produit-detail-logic.test.ts`.
 */
export type ProduitDetailChiffres = Pick<
    SerializedProduct,
    "prixHT" | "prixAchat" | "prixAchatDefault" | "stockActuel" | "stockMinimum"
>;

/** Prix d'achat affiché : fournisseur par défaut si défini, sinon prix d'achat du produit. */
export function prixAchatAffiche(p: ProduitDetailChiffres): string {
    return p.prixAchatDefault != null
        ? formatTND(String(p.prixAchatDefault))
        : formatTND(p.prixAchat);
}

/** Niveaux de stock numériques (jauges / graphique de stock). */
export function stockNiveaux(
    p: ProduitDetailChiffres
): { stockActuel: number; stockMinimum: number } {
    return {
        stockActuel: parseFloat(p.stockActuel),
        stockMinimum: parseFloat(p.stockMinimum),
    };
}

/** Valorisation du stock : stock actuel × prix HT, formatés en TND. */
export function valeurStockAffiche(p: ProduitDetailChiffres): string {
    return formatTND(String(parseFloat(p.stockActuel) * parseFloat(p.prixHT)));
}
