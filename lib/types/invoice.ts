import type { InvoiceStatus } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedProduct } from "./product";
import type { SerializedPayment } from "./payment";

export interface SerializedInvoiceLine {
    id: string;
    invoiceId: string;
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
    bonLivraisonId?: string | null;
    product?: SerializedProduct | null;
}

export interface SerializedInvoiceEffet {
    id: string;
    numero: string;
    montant: string;
    status: string;
    dateEcheance: Date | null;
    type: string;
}

export interface SerializedInvoiceCheque {
    id: string;
    numero: string;
    montant: string;
    status: string;
    dateEcheance: Date | null;
    type: string;
}

export interface SerializedInvoice {
    id: string;
    numero: string;
    tiersId: string;
    dateEmission: Date;
    dateEcheance: Date | null;
    baseHT: string;
    totalHT: string;
    totalTVA: string;
    totalFodec: string;
    totalRetenue: string;
    totalTTC: string;
    montantPaye: string;
    resteAPayer: string;
    status: InvoiceStatus;
    notes: string | null;
    bcViseActif: boolean;
    bcViseNumero: string | null;
    dateSN: string | null;
    poids: string | null;
    poidsBrut: string | null;
    nbColis: number | null;
    devise: string;
    tauxChange: string | null;
    montantTND: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedInvoiceLine[];
    payments?: SerializedPayment[];
    effets?: SerializedInvoiceEffet[];
    cheques?: SerializedInvoiceCheque[];
    bonsLivraison?: { bonLivraisonId: string; bonLivraison?: { numero: string; dateLivraison: Date | null } }[];
}
