import type { SerializedBonCommandeLigneDetail, SerializedBonCommandeLine } from "@/lib/types";

export interface RapprochementView {
    lignes: SerializedBonCommandeLine[];
    lignesProduction: SerializedBonCommandeLine[];
    lignesBloquantes: SerializedBonCommandeLine[];
    honorable: boolean;
}

export function computeEcart(
    ligne: Pick<SerializedBonCommandeLine, "quantite" | "quantiteDetaillee">
): number {
    return Number(ligne.quantite) - Number(ligne.quantiteDetaillee);
}

export function formatEcart(ecart: number): string {
    return ecart > 0 ? `+${ecart.toFixed(3)}` : ecart.toFixed(3);
}

export function formatQuantite3(value: string | number): string {
    return Number(value).toFixed(3);
}

export function formatDetailAttributes(detail: SerializedBonCommandeLigneDetail): string {
    return (
        [
            detail.taille && `Taille: ${detail.taille}`,
            detail.couleur && `Couleur: ${detail.couleur}`,
            detail.broderie && `Broderie: ${detail.broderie}`,
            detail.impressionDtf && `DTF: ${detail.impressionDtf}`,
        ]
            .filter(Boolean)
            .join(" · ") || "—"
    );
}

// Un BC mixte n'affiche que ses lignes PRODUCTION dans le tableau (les lignes
// STOCK sont réservées directement) ; l'honorable, lui, se calcule toujours sur
// TOUTES les lignes production (cf. lib/bon-commande/reconciliation.ts).
export function summarizeRapprochement(
    allLignes: SerializedBonCommandeLine[],
    isMixed?: boolean
): RapprochementView {
    const lignes = isMixed ? allLignes.filter((l) => l.typeSource === "PRODUCTION") : allLignes;
    const lignesProduction = allLignes.filter((l) => l.typeSource === "PRODUCTION");
    const lignesBloquantes = lignesProduction.filter((l) => l.statutRapprochement !== "RECONCILIE");
    return {
        lignes,
        lignesProduction,
        lignesBloquantes,
        honorable: lignesBloquantes.length === 0,
    };
}
