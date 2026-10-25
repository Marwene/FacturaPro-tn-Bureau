export interface SerializedProductVariant {
    id: string;
    productId: string;
    nom: string;
    code: string | null;
    attributs: Record<string, string> | null;
    prixHT: string | null;
    stockActuel: string;
    stockMinimum: string;
    photoUrl: string | null;
    actif: boolean;
    ordre: number;
    createdAt: Date;
    updatedAt: Date;
}
