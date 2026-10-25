import type { BonCommandeStatus } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedProduct } from "./product";

export interface SerializedBonCommandeLigneDetail {
    id: string;
    bonCommandeLineId: string;
    variantId: string | null;
    taille: string | null;
    couleur: string | null;
    broderie: string | null;
    impressionDtf: string | null;
    quantite: string;
    sourceDocument: string | null;
    createdAt: Date;
}

export interface SerializedBonCommandeOF {
    id: string;
    code: string;
    statut: string;
    quantite: number;
}

export interface SerializedBonCommandeLine {
    id: string;
    bonCommandeId: string;
    productId: string | null;
    description: string;
    quantite: string;
    prixHT: string;
    remise: string;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
    totalHT: string;
    ordre: number;
    typeSource: "PRODUCTION" | "STOCK";
    quantiteDetaillee: string;
    statutRapprochement: "EN_ATTENTE_DETAIL" | "ECART_DETECTE" | "RECONCILIE";
    derniereVerification: Date | null;
    product?: SerializedProduct | null;
    ordresFabrication?: SerializedBonCommandeOF[];
    details?: SerializedBonCommandeLigneDetail[];
}

export interface SerializedBonCommande {
    id: string;
    numero: string;
    tiersId: string;
    companyId: string | null;
    dateCreation: Date;
    dateExpiration: Date | null;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalFodec: string;
    totalTTC: string;
    status: BonCommandeStatus;
    notes: string | null;
    referenceClient: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedBonCommandeLine[];
}
