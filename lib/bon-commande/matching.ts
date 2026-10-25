export type ProductForMatching = {
    id: string;
    code: string;
    nom: string;
    codeBarre: string | null;
};

export function normalizeForMatch(value: string): string {
    return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Retrouve l'id d'un Product à partir d'une description ou d'un code article
 * scanné par OCR. Utilisé à la fois pour l'extraction du Bon de Commande
 * principal et pour celle du Bon de Commande détaillé (rapprochement).
 */
export function matchProductId(description: string, products: ProductForMatching[]): string | null {
    const desc = normalizeForMatch(description);
    if (!desc) return null;

    for (const p of products) {
        const codeBarre = p.codeBarre ? normalizeForMatch(p.codeBarre) : "";
        if (codeBarre && codeBarre === desc) return p.id;
    }

    for (const p of products) {
        const code = normalizeForMatch(p.code);
        if (code && (code === desc || desc.includes(code))) return p.id;
    }

    for (const p of products) {
        const nom = normalizeForMatch(p.nom);
        if (nom && (nom.includes(desc) || desc.includes(nom))) return p.id;
    }

    return null;
}
