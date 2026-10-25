import type { QuoteStatus } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedProduct } from "./product";

export interface SerializedQuoteLine {
    id: string;
    quoteId: string;
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

export interface SerializedQuote {
    id: string;
    numero: string;
    tiersId: string;
    dateCreation: Date;
    dateExpiration: Date | null;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalFodec: string;
    totalTTC: string;
    status: QuoteStatus;
    notes: string | null;
    invoiceId: string | null;
    devise: string;
    tauxChange: string | null;
    montantTND: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedQuoteLine[];
}
