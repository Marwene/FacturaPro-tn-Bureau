import type { AvoirStatus, AvoirType, MouvementFinancierType } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedProduct } from "./product";
import type { SerializedInvoice } from "./invoice";
import type { SerializedPayment } from "./payment";

export interface SerializedAvoirLine {
    id: string;
    avoirId: string;
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
    product?: SerializedProduct | null;
}

export interface SerializedAvoir {
    id: string;
    numero: string;
    type: AvoirType;
    invoiceId: string | null;
    tiersId: string | null;
    companyId: string | null;
    dateEmission: Date;
    motif: string | null;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalFodec: string;
    totalTTC: string;
    status: AvoirStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers | null;
    invoice?: SerializedInvoice | null;
    lines?: SerializedAvoirLine[];
    payments?: SerializedPayment[];
    mouvements?: SerializedMouvementFinancier[];
}

export interface SerializedMouvementFinancier {
    id: string;
    type: MouvementFinancierType;
    montant: string;
    tiersId: string | null;
    companyId: string | null;
    dateMouvement: Date;
    notes: string | null;
    createdAt: Date;
}
