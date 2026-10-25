import type { DeliveryNoteStatus } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedProduct } from "./product";

export interface SerializedDeliveryNoteLine {
    id: string;
    bonLivraisonId: string;
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

export interface SerializedDeliveryNote {
    id: string;
    numero: string;
    tiersId: string;
    dateCreation: Date;
    dateLivraison: Date | null;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalFodec: string;
    totalTTC: string;
    status: DeliveryNoteStatus;
    notes: string | null;
    blViseActif: boolean;
    snNumero: string | null;
    dateSN: string | null;
    poidsBrut: string | null;
    poidsNet: string | null;
    nbColis: number | null;
    devise: string;
    tauxChange: string | null;
    montantTND: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedDeliveryNoteLine[];
    invoices?: Array<{
        invoice: {
            id: string;
            numero: string;
            dateEmission: Date;
            status: string;
        };
    }>;
}
