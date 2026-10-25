import type { ProductRef } from "./product";

export interface SerializedDesignPersonnalise {
    id: string;
    companyId: string;
    productId: string;
    variantId: string | null;
    nom: string;
    layers: unknown;
    thumbnail: string | null;
    statut: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DesignAvecProduit extends SerializedDesignPersonnalise {
    product?: ProductRef | null;
}

export interface DesignAvecRelations extends DesignAvecProduit {
    ordres?: { id: string; code: string; statut: string }[];
}
