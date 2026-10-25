export interface SerializedMatierePremiere {
    id: string;
    companyId: string;
    code: string;
    nom: string;
    type: string;
    unite: string;
    prixUnitaire: string;
    stockActuel: string;
    stockMinimum: string;
    fournisseurId: string | null;
    description: string | null;
    actif: boolean;
    createdAt: Date;
    updatedAt: Date;
}
