export function generateProductQRData(product: {
    id: string;
    code: string;
    nom: string;
    description?: string | null;
    categorie?: string | null;
    prixHT: string | number;
    tauxTVA: string | number;
    stockActuel: string | number;
    unite: string;
}) {
    return JSON.stringify({
        id: product.id,
        code: product.code,
        nom: product.nom,
        description: product.description ?? "",
        categorie: product.categorie ?? "",
        prixHT: Number(product.prixHT),
        tauxTVA: Number(product.tauxTVA),
        stockActuel: Number(product.stockActuel),
        unite: product.unite,
        generatedAt: new Date().toISOString(),
    });
}
