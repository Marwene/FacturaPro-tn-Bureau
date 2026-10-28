import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";

export type LabelOption = "qr" | "barcode" | "name" | "code" | "price" | "category" | "variant";

export const ALL_OPTIONS: { key: LabelOption; label: string }[] = [
    { key: "qr", label: "QR Code" },
    { key: "barcode", label: "Code-barres" },
    { key: "name", label: "Nom" },
    { key: "code", label: "Code" },
    { key: "price", label: "Prix HT" },
    { key: "category", label: "Catégorie" },
    { key: "variant", label: "Déclinaison" },
];

export interface LabelRow {
    product: SerializedProduct;
    variant: SerializedProductVariant | null;
}

export function filterProduits(products: SerializedProduct[], search: string): SerializedProduct[] {
    return products.filter((p) =>
        !search || p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );
}

export function buildPrintItems(
    selected: Map<string, LabelRow>,
    variantMap: Map<string, SerializedProductVariant[]>,
): LabelRow[] {
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
    return printItems;
}
