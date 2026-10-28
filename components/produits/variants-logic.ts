export interface VariantFormData {
    id?: string;
    nom: string;
    code: string;
    attributs: Record<string, string>;
    prixHT: string;
    stockActuel: string;
    stockMinimum: string;
    photoUrl: string;
    actif: boolean;
    ordre: number;
}

export type VariantStockStatus = "RUPTURE" | "CRITIQUE" | "OK";

export const emptyVariant = (ordre: number): VariantFormData => ({
    nom: "",
    code: "",
    attributs: {},
    prixHT: "",
    stockActuel: "0",
    stockMinimum: "0",
    photoUrl: "",
    actif: true,
    ordre,
});

export function generateVariantNom(attributs: Record<string, string>): string {
    return Object.values(attributs).filter(Boolean).join(" / ");
}

export function resolveVariantNom(nom: string, attributs: Record<string, string>, index: number): string {
    return nom || generateVariantNom(attributs) || `Déclinaison ${index}`;
}

export function variantStockStatus(stockActuel: string, stockMinimum: string): VariantStockStatus {
    const stock = parseFloat(stockActuel || "0");
    const min = parseFloat(stockMinimum || "0");
    return stock <= 0 ? "RUPTURE" : stock <= min ? "CRITIQUE" : "OK";
}

export function formatVariantAttributs(attributs: Record<string, string>): string {
    return Object.entries(attributs)
        .map(([k, val]) => `${k}: ${val}`)
        .join(", ");
}

export function totalVariantsStock(variants: VariantFormData[]): number {
    return variants.reduce((sum, v) => sum + parseFloat(v.stockActuel || "0"), 0);
}

export function countActiveVariants(variants: VariantFormData[]): number {
    return variants.filter((v) => v.actif).length;
}

export function reorderVariants(variants: VariantFormData[], oldIdx: number, newIdx: number): VariantFormData[] {
    const next = [...variants];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    return next.map((v, i) => ({ ...v, ordre: i }));
}

export function commitVariantEdit(variants: VariantFormData[], editIndex: number, editData: VariantFormData): VariantFormData[] {
    const updated = { ...editData, nom: resolveVariantNom(editData.nom, editData.attributs, editIndex + 1) };
    if (editIndex === -1) return [...variants, updated];
    const next = [...variants];
    next[editIndex] = updated;
    return next;
}

export function removeVariantAt(variants: VariantFormData[], idx: number): VariantFormData[] {
    return variants.filter((_, i) => i !== idx);
}

export function addVariantAttribut(editData: VariantFormData, cle: string, valeur: string): VariantFormData {
    const key = cle.trim();
    if (!key) return editData;
    return { ...editData, attributs: { ...editData.attributs, [key]: valeur.trim() } };
}

export function removeVariantAttribut(editData: VariantFormData, cle: string): VariantFormData {
    const next = { ...editData.attributs };
    delete next[cle];
    return { ...editData, attributs: next };
}
