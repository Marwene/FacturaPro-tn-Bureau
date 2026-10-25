import type { ProductRef } from "./product";

export interface SerializedOrdreFabrication {
    id: string;
    companyId: string;
    code: string;
    tiersId: string | null;
    productId: string;
    variantId: string | null;
    designId: string | null;
    bonCommandeLineId: string | null;
    quantite: number;
    details: unknown;
    statut: string;
    dateDebut: Date | null;
    dateFin: Date | null;
    dateLivraison: Date | null;
    ficheTechniqueUrl: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrdreAvecProduct extends SerializedOrdreFabrication {
    product?: ProductRef | null;
}

export type OrdrePlan = { [K in keyof OrdreAvecProduct]: OrdreAvecProduct[K] } & {
    planningRowId?: string | null;
};

export interface OFDetailLine {
    variantId: string;
    variantNom: string;
    taille: string;
    couleur: string;
    quantite: number;
    quantiteProduite: number;
}
