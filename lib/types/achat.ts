import type { AchatStatus, MouvementType, AchatType, AchatCategorie } from "./enums";
import type { SerializedTiers } from "./client";

export interface SerializedAchatLine {
    id: string;
    achatId: string;
    productId: string | null;
    description: string;
    quantite: string;
    prixAchat: string;
    remise: string;
    tauxTVA: string;
    totalHT: string;
    ordre: number;
    product?: import("./product").SerializedProduct | null;
}

export interface SerializedAchat {
    id: string;
    numero: string;
    tiersId: string;
    companyId: string | null;
    dateFacture: Date;
    dateEcheance: Date | null;
    referenceFournisseur: string | null;
    type: AchatType;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalTTC: string;
    timbreFiscal: string;
    status: AchatStatus;
    notes: string | null;
    categorieAchat: AchatCategorie | null;
    blAchatId: string | null;
    blAchat?: SerializedAchat | null;
    facturesLiees?: SerializedAchat[];
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedAchatLine[];
}

export interface SerializedStockMovement {
    id: string;
    productId: string;
    achatId: string | null;
    type: MouvementType;
    quantite: string;
    referenceType: string;
    referenceId: string | null;
    date: Date;
    notes: string | null;
    createdAt: Date;
    product?: { id: string; code: string; nom: string; unite: string } | null;
}
