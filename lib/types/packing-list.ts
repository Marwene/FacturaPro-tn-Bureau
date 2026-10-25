export interface SerializedPackingList {
    id: string;
    companyId: string;
    ordreId: string;
    numero: string;
    capaciteCarton: number;
    cartonTypes: unknown;
    nbCartons: number;
    totalPieces: number;
    statut: string;
    packingListUrl: string | null;
    etiquettesUrl: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PackingOFDetail {
    taille: string;
    quantite: number;
}
